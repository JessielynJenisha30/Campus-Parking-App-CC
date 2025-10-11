import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const response = await ai.models.list();
    console.log("Available models:");
    response.models.forEach((m) => console.log("-", m.name));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
