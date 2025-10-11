// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai"; // correct SDK

dotenv.config();
const app = express();
app.use(express.json());

// configure CORS to allow only your frontend (change in production)
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin }));

// Basic rate limiter
app.use(
  rateLimit({
    windowMs: 60_000, // 1 minute
    max: 30, // max requests per IP per window
  })
);

// Instantiate Gemini client (reads API key from env)
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Static campus parking policies & FAQ (used as context)
const parkingPoliciesText = `
Campus Parking Policies:
- Visitors: Zone B (8:00 AM - 8:00 PM).
- Staff: Zone A (all day, except maintenance).
- Students: Zone C (daytime).
- Late pickup: ₹50 per hour fine after allowed time.
- Overnight parking: Not allowed without special permission.
- Lost ticket fine: ₹200.
- If user asks unrelated questions, politely state you only handle parking queries.
`;

// Small helper — turn ms into human text
function humanTimeLeft(ms) {
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours} hour(s) and ${mins} minute(s)`;
  if (hours > 0) return `${hours} hour(s)`;
  return `${mins} minute(s)`;
}

// Endpoint to chat with Gemini
app.post("/chat", async (req, res) => {
  try {
    const { message, userContext } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // If userContext provided (future DB), compute remaining time
    let dynamicContext = "";
    if (userContext && userContext.parkedAt && userContext.durationHours) {
      const start = new Date(userContext.parkedAt);
      const end = new Date(
        start.getTime() + userContext.durationHours * 3600 * 1000
      );
      const now = new Date();
      const msLeft = end - now;
      const timeLeftStr = humanTimeLeft(msLeft);
      if (timeLeftStr) {
        dynamicContext = `User parking data:\n- Vehicle: ${
          userContext.vehicleNumber || "N/A"
        }\n- Parked at: ${start.toLocaleString()}\n- Duration chosen: ${
          userContext.durationHours
        } hour(s)\n- Allowed until: ${end.toLocaleString()}\n- Time remaining: ${timeLeftStr}\n\n`;
      } else {
        dynamicContext = `User parking data:\n- Your parking time has expired (was allowed until ${end.toLocaleString()}).\n\n`;
      }
    }

    // Build system prompt + context
    const systemPrompt = `
You are a concise, helpful assistant for a Campus Parking System.
Use the provided parking policies and any user parking data (if given)
to answer the user's parking-related question precisely.
If the question is not related to campus parking, reply:
"Sorry — I only answer questions about campus parking."
Keep answers short and actionable.
`;

    const fullPrompt = `
${systemPrompt}

${parkingPoliciesText}

${dynamicContext}

User question: ${message}

Assistant:
`;

    // ✅ Correct way to call Gemini with new SDK
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

// health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ Backend listening on port ${port}`));
