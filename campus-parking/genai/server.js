// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sql from "mssql";

dotenv.config();
const app = express();
app.use(express.json());

// ---------- CORS ----------
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin }));

// ---------- RATE LIMIT ----------
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
  })
);

// ---------- GEMINI ----------
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------- DB CONFIG ----------
const dbConfig = {
  user: "CloudSA91514d09",
  password: "CampusParking@pass",
  server: "campus-parking-server.database.windows.net",
  database: "campus-parking",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  }
};

sql.connect(dbConfig)
  .then(() => console.log("✅ Chatbot connected to SQL DB"))
  .catch((err) => console.error("❌ DB connect failed:", err.message));


// ---------- HELPER ----------
function humanTimeLeft(ms) {
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours && mins) return `${hours} hour(s) and ${mins} minute(s)`;
  if (hours) return `${hours} hour(s)`;
  return `${mins} minute(s)`;
}


// ---------- CHAT ENDPOINT ----------
app.post("/chat", async (req, res) => {
  try {
    const { message, email } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    let dynamicContext = "";

    // ---------------------------------------
    // ✅ FETCH USER BOOKING FROM DATABASE
    // ---------------------------------------
    if (email) {
      const userResult = await sql.query`
        SELECT name FROM dbo.users WHERE email = ${email}
      `;

      if (userResult.recordset.length > 0) {
        const userName = userResult.recordset[0].name;

        const bookingResult = await sql.query`
          SELECT TOP 1 *
          FROM dbo.bookings
          WHERE name = ${userName}
          ORDER BY id DESC
        `;

        if (bookingResult.recordset.length > 0) {
          const b = bookingResult.recordset[0];

          const now = new Date();
          const end = new Date(b.parked_till);
          const msLeft = end - now;
          const timeLeftStr = humanTimeLeft(msLeft);

          dynamicContext = `
User Active Parking Data:
- Slot No: ${b.slot_no}
- Vehicle No: ${b.vehicle_number}
- Parked At: ${new Date(b.parked_at).toLocaleString()}
- Allowed Till: ${new Date(b.parked_till).toLocaleString()}
- Time Remaining: ${timeLeftStr ? timeLeftStr : "Expired"}
`;
        }
      }
    }

    // ---------- STATIC PARKING POLICY ----------
    const parkingPoliciesText = `
Campus Parking Policies:
- Visitors: Zone B (8:00 AM - 8:00 PM).
- Staff: Zone A (all day).
- Students: Zone C (daytime).
- Late pickup fine: ₹50 per hour after allowed time.
- Overnight parking not allowed without permission.
- Lost ticket fine: ₹200.
`;

    const systemPrompt = `
You are a helpful assistant for a Campus Parking System.
Use parking policies and user booking data when available.
If the question is NOT related to parking, answer:
"Sorry — I only answer questions about campus parking."
Be short and accurate.
`;

    const fullPrompt = `
${systemPrompt}

${parkingPoliciesText}

${dynamicContext}

User question: ${message}

Answer:
`;

    // ---------- GEMINI REQUEST ----------
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();

    res.json({ reply });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});


// HEALTH CHECK
app.get("/health", (req, res) => res.json({ status: "ok" }));


const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ Chatbot running on ${port}`));
