import React, { useState } from "react";
import Cookies from "js-cookie";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // get logged-in user from cookies
  const user = JSON.parse(Cookies.get("user") || "{}");

  // Use Vite env variables in the browser; Vite exposes variables via import.meta.env
  // Ensure your env var is prefixed with VITE_ (for example VITE_BACKEND_URL)
  const BACKEND_URL = "http://localhost:8080/chat";

  async function sendMessage(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setText("");

    try {
      const resp = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          email: user.email,   // ✅ IMPORTANT ADDITION
        }),
      });

      const data = await resp.json();
      const botText = data?.reply || "No reply from server.";
      setMessages((m) => [...m, { role: "bot", text: botText }]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Error contacting server." },
      ]);
    }
  }

  return (
    <div
      style={{
        width: 420,
        margin: "auto",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          height: 320,
          overflowY: "auto",
          padding: 8,
          marginBottom: 8,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === "user" ? "right" : "left",
              margin: 6,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 10,
                borderRadius: 12,
                background: m.role === "user" ? "#dcf8c6" : "#f1f0f0",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about campus parking..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "#007bff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
