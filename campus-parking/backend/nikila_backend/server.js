import express from "express";
import sql from "mssql";
import cookieParser from "cookie-parser";
import cors from "cors";

import cron from "node-cron";
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://10.73.150.23:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);


// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    // Delete expired bookings
    await sql.query`
      DELETE FROM dbo.bookings 
      WHERE parked_till < ${now};
    `;

    // Free up the slots that were occupied
    await sql.query`
      UPDATE dbo.parking_slots
      SET isTaken = 0
      WHERE lot_no NOT IN (SELECT slot_no FROM dbo.bookings);
    `;

    console.log("🧹 Cleaned up expired bookings:", now.toISOString());
  } catch (err) {
    console.error("Cleanup Error:", err.message);
  }
});


const dbConfig = {
  user: "CloudSA91514d09",
  password: "CampusParking@pass",
  server: "campus-parking-server.database.windows.net",
  database: "campus-parking",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

// Test DB connection
sql.connect(dbConfig)
  .then(() => console.log("✅ Connected to Azure SQL Database"))
  .catch(err => console.error("❌ DB Connection Failed:", err));

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
      VALUES (${name}, ${email}, ${password}, ${isUser})`;

    res.status(201).json({ message: "Signup successful", name, email, isUser });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- LOGIN --------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await sql.query`SELECT * FROM dbo.users WHERE email=${email} AND password=${password}`;
    if (result.recordset.length === 0) return res.status(401).send("Invalid credentials");

    const user = result.recordset[0];
    res.cookie("user", { name: user.name, email: user.email, isUser: user.isUser });
    res.json({ name: user.name, email: user.email, isUser: user.isUser });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- LIST PARKING SLOTS --------------------
app.get("/slots", async (req, res) => {
  try {
    const result = await sql.query`SELECT lot_no, isTaken FROM dbo.parking_slots`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------- BOOK PARKING SLOT --------------------
app.post("/book", async (req, res) => {
  let { slot_no, name, vehicle_number, parked_at, parked_till } = req.body;

  try {
    // Convert to Date objects
    parked_at = new Date(parked_at);
    parked_till = new Date(parked_till);

    const checkSlot = await sql.query`SELECT isTaken FROM dbo.parking_slots WHERE lot_no=${slot_no}`;
    if (checkSlot.recordset.length === 0 || checkSlot.recordset[0].isTaken)
      return res.status(400).json({ message: "Slot not available" });

    await sql.query`
      INSERT INTO dbo.bookings (slot_no, name, vehicle_number, parked_at, parked_till)
      VALUES (${slot_no}, ${name}, ${vehicle_number}, ${parked_at}, ${parked_till})`;

    await sql.query`UPDATE dbo.parking_slots SET isTaken=1 WHERE lot_no=${slot_no}`;

    res.json({ slot_no, name, vehicle_number, parked_till });
  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).json({ error: err.message });
  }
});



// -------------------- VALIDATE QR CODE --------------------
app.post("/validate", async (req, res) => {
  const { slot_no, name, parked_till, vehicle_number } = req.body;

  try {
    const result = await sql.query`
      SELECT * FROM dbo.bookings 
      WHERE slot_no=${slot_no} AND name=${name} AND vehicle_number=${vehicle_number} AND parked_till=${parked_till}`;

    if (result.recordset.length === 0)
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
    // Find user by email
    const userResult = await sql.query`SELECT name FROM dbo.users WHERE email = ${email}`;
    if (userResult.recordset.length === 0)
      return res.status(404).json({ message: "User not found" });

    const userName = userResult.recordset[0].name;

    // Get all bookings linked to this user's name
    const bookings = await sql.query`
      SELECT 
        b.slot_no, 
        b.vehicle_number, 
        b.parked_at, 
        b.parked_till, 
        p.isTaken
      FROM dbo.bookings AS b
      JOIN dbo.parking_slots AS p ON b.slot_no = p.lot_no
      WHERE b.name = ${userName}
      ORDER BY b.id DESC;
    `;

    res.json(bookings.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// -------------------- SERVER START --------------------
app.listen(5000, "0.0.0.0", () => console.log("Backend running on port 5000"));
