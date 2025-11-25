import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import sql from "mssql";
import cron from "node-cron";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// -------------------- CORS --------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://10.73.150.23:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// -------------------- RATE LIMIT --------------------
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
  })
);

// -------------------- GEMINI SETUP --------------------
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// -------------------- DB CONFIG --------------------
const dbConfig = {
  user: "CloudSA91514d09",
  password: "CampusParking@pass",
  server: "campus-parking-server.database.windows.net",
  database: "campus-parking",
  port: 1433,
  options: { encrypt: true, trustServerCertificate: false },
};

// Connect DB
sql.connect(dbConfig)
  .then(() => console.log("✅ Connected to Azure SQL Database"))
  .catch((err) => console.error("❌ DB connection failed:", err.message));


// -------------------- CRON: AUTO CLEANUP --------------------
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    await sql.query`
      DELETE FROM dbo.bookings 
      WHERE parked_till < ${now}
    `;

    await sql.query`
      UPDATE dbo.parking_slots
      SET isTaken = 0
      WHERE lot_no NOT IN (SELECT slot_no FROM dbo.bookings)
    `;

    console.log("🧹 Cleaned expired bookings at", now.toISOString());
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
});


// -------------------- SIGNUP --------------------
app.post("/signup", async (req, res) => {
  const { name, email, password, isUser } = req.body;

  if (!name || !email || !password || isUser === undefined)
    return res.status(400).send("All fields required");

  try {
    const check = await sql.query`SELECT * FROM dbo.users WHERE email=${email}`;
    if (check.recordset.length > 0)
      return res.status(400).send("Email already exists");

    await sql.query`
      INSERT INTO dbo.users (name, email, password, isUser)
      VALUES (${name}, ${email}, ${password}, ${isUser})
    `;

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- LOGIN --------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await sql.query`
      SELECT * FROM dbo.users 
      WHERE email=${email} AND password=${password}
    `;

    if (result.recordset.length === 0)
      return res.status(401).send("Invalid credentials");

    const user = result.recordset[0];

    res.cookie("user", { name: user.name, email: user.email, isUser: user.isUser });
    res.json({ name: user.name, email: user.email, isUser: user.isUser });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- GET PARKING SLOTS --------------------
app.get("/slots", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM dbo.parking_slots`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- BOOK SLOT --------------------
app.post("/book", async (req, res) => {
  let { slot_no, name, vehicle_number, parked_at, parked_till } = req.body;

  try {
    parked_at = new Date(parked_at);
    parked_till = new Date(parked_till);

    const checkSlot = await sql.query`
      SELECT isTaken FROM dbo.parking_slots WHERE lot_no=${slot_no}
    `;

    if (!checkSlot.recordset.length || checkSlot.recordset[0].isTaken)
      return res.status(400).json({ message: "Slot not available" });

    await sql.query`
      INSERT INTO dbo.bookings (slot_no, name, vehicle_number, parked_at, parked_till)
      VALUES (${slot_no}, ${name}, ${vehicle_number}, ${parked_at}, ${parked_till})
    `;

    await sql.query`
      UPDATE dbo.parking_slots SET isTaken=1 WHERE lot_no=${slot_no}
    `;

    res.json({ message: "Booked successfully" });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- VALIDATE QR CODE --------------------
app.post("/validate", async (req, res) => {
  const { slot_no, name, parked_till, vehicle_number } = req.body;

  try {
    const result = await sql.query`
      SELECT * FROM dbo.bookings 
      WHERE slot_no=${slot_no}
      AND name=${name}
      AND vehicle_number=${vehicle_number}
      AND parked_till=${parked_till}
    `;

    if (!result.recordset.length)
      return res.json({ status: "Failed", message: "Invalid Ticket" });

    res.json({ status: "Success", message: "Valid Ticket" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- GET USER BOOKINGS --------------------
app.get("/bookings/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const userResult = await sql.query`
      SELECT name FROM dbo.users WHERE email=${email}
    `;

    if (!userResult.recordset.length)
      return res.status(404).json({ message: "User not found" });

    const userName = userResult.recordset[0].name;

    const bookings = await sql.query`
      SELECT b.slot_no, b.vehicle_number, b.parked_at, b.parked_till, p.isTaken
      FROM dbo.bookings b
      JOIN dbo.parking_slots p ON b.slot_no = p.lot_no
      WHERE b.name=${userName}
      ORDER BY b.id DESC
    `;

    res.json(bookings.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/', (req, res) => {
  // Send a simple, clear JSON response
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Azure-deployed application!',
    environment: process.env.NODE_ENV || 'development',
    port_used: PORT
  });
});

// -------------------- CHATBOT ENDPOINT --------------------
function humanTimeLeft(ms) {
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs && rem) return `${hrs} hour(s) and ${rem} minute(s)`;
  if (hrs) return `${hrs} hour(s)`;
  return `${rem} minute(s)`;
}

app.post("/chat", async (req, res) => {
  try {
    const { message, email } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    let dynamicContext = "";

    // Fetch user parking data
    if (email) {
      const userResult = await sql.query`
        SELECT name FROM dbo.users WHERE email=${email}
      `;

      if (userResult.recordset.length > 0) {
        const userName = userResult.recordset[0].name;

        const bookingResult = await sql.query`
          SELECT TOP 1 * FROM dbo.bookings 
          WHERE name=${userName} ORDER BY id DESC
        `;

        if (bookingResult.recordset.length > 0) {
          const b = bookingResult.recordset[0];
          const now = new Date();
          const end = new Date(b.parked_till);
          const msLeft = end - now;

          dynamicContext = `
User Parking Details:
- Slot: ${b.slot_no}
- Vehicle: ${b.vehicle_number}
- Parked At: ${b.parked_at}
- Allowed Till: ${b.parked_till}
- Time Left: ${humanTimeLeft(msLeft) || "Expired"}
`;
        }
      }
    }

    const policies = `
Campus Parking Policies:
- Visitors: Zone B (8 AM - 8 PM)
- Staff: Zone A (all day)
- Students: Zone C (daytime)
- Late fine: ₹50/hour
- No overnight parking without approval
`;

    const systemPrompt = `
You are the Campus Parking Assistant.
Answer only parking-related questions.
If user asks something else, reply:
"Sorry — I only answer questions about campus parking."
Use the user's booking data when relevant.
`;

    const fullPrompt = `${systemPrompt}\n${policies}\n${dynamicContext}\nUser: ${message}\nAnswer:`;


    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(fullPrompt);

    res.json({ reply: result.response.text() });

  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: "Chatbot failed" });
  }
});



const PORT = process.env.PORT ||  4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));