import express from "express";
import sql from "mssql";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

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
  const { slot_no, name, vehicle_number, parked_at, parked_till } = req.body;

  try {
    const checkSlot = await sql.query`SELECT isTaken FROM dbo.parking_slots WHERE lot_no=${slot_no}`;
    if (checkSlot.recordset.length === 0 || checkSlot.recordset[0].isTaken)
      return res.status(400).send("Slot not available");

    await sql.query`
      INSERT INTO dbo.bookings (slot_no, name, vehicle_number, parked_at, parked_till)
      VALUES (${slot_no}, ${name}, ${vehicle_number}, ${parked_at}, ${parked_till})`;

    await sql.query`UPDATE dbo.parking_slots SET isTaken=1 WHERE lot_no=${slot_no}`;

    res.json({ slot_no, name, vehicle_number, parked_till });
  } catch (err) {
    res.status(500).send(err.message);
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

// -------------------- SERVER START --------------------
app.listen(5000, () => console.log("🚗 Parking Management Server running on port 5000"));