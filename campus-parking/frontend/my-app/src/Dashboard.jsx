import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
// Right-side chat panel implemented in this file. Do not modify Chatbot.jsx per request.

export default function Dashboard() {
  const user = JSON.parse(Cookies.get("user") || "{}");
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("slots");
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [parkedTill, setParkedTill] = useState("");
  const [notification, setNotification] = useState("");
  const [qrModal, setQrModal] = useState(null);
  const [loading, setLoading] = useState(false);
  // Right-side chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  const API_BASE = "http://10.73.150.23:5000";

  async function fetchSlots() {
    const res = await fetch(`${API_BASE}/slots`);
    const data = await res.json();
    setSlots(data);
  }

  async function fetchBookings() {
    const res = await fetch(`${API_BASE}/bookings/${user.email}`);
    const data = await res.json();
    setBookings(data);
  }

  useEffect(() => {
    if (activeTab === "slots") fetchSlots();
    else fetchBookings();
  }, [activeTab]);

  async function handleBook(e) {
    e.preventDefault();
    setLoading(true);
    setNotification("");

    const bookingData = {
      slot_no: selectedSlot,
      name: user.name,
      vehicle_number: vehicleNumber,
      parked_at: new Date().toISOString(),
      parked_till: parkedTill,
    };

    try {
      const res = await fetch(`${API_BASE}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification(`✅ Booked ${data.slot_no} until ${data.parked_till}`);
        setSelectedSlot(null);
        setVehicleNumber("");
        setParkedTill("");
        fetchSlots();
      } else {
        setNotification(`❌ ${data.message || "Booking failed"}`);
      }
    } catch (err) {
      setNotification("❌ Network or Server Error");
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    Cookies.remove("user");
    navigate("/login");
  };

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

  async function sendChat(e) {
    e?.preventDefault();
    const trimmed = chatText.trim();
    if (!trimmed) return;

    // add user message locally
    setChatMessages((m) => [...m, { role: "user", text: trimmed }]);
    setChatText("");
    setChatLoading(true);

    try {
      const resp = await fetch("http://localhost:8080/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, email: user.email }),
      });

      const data = await resp.json();
      const botText = data?.reply || data?.message || "No reply from server.";
      setChatMessages((m) => [...m, { role: "bot", text: botText }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((m) => [...m, { role: "bot", text: "Error contacting server." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-700">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-600 text-center py-6 border-b">
            Parking Dashboard
          </h1>
          <nav className="flex flex-col p-4 gap-3">
            <button
              onClick={() => setActiveTab("slots")}
              className={`p-3 rounded-lg text-left font-medium ${
                activeTab === "slots"
                  ? "bg-cyan-500 text-white"
                  : "hover:bg-cyan-100"
              }`}
            >
              Available Slots
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`p-3 rounded-lg text-left font-medium ${
                activeTab === "bookings"
                  ? "bg-cyan-500 text-white"
                  : "hover:bg-cyan-100"
              }`}
            >
              Booked Tickets
            </button>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Right-side Chat Toggle & Panel */}
      <div>
        {/* Toggle Button (bottom-right) - only show when panel is closed */}
        {!chatOpen && (
          <div className="fixed right-6 bottom-6 z-50">
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg hover:scale-105 transform transition"
              aria-expanded={chatOpen}
              aria-label="Open chat"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 8h10M7 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12c0 4.97-4.03 9-9 9a9 9 0 01-8-4.99L3 21l4.01-1.01A9 9 0 1111.99 3C16.97 3 21 7.03 21 12z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Slide-in panel */}
        <div
          className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform z-40 ${
            chatOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-hidden={!chatOpen}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Campus Assistant</h3>
                <p className="text-sm text-slate-500">Ask about parking, tickets, and policies</p>
              </div>
              <div>
                <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>
            </div>

            <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 mt-8">Hi! I'm the campus parking assistant. How can I help?</div>
              )}

              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`${m.role === "user" ? "bg-cyan-500 text-white" : "bg-white text-slate-800"} max-w-[75%] p-3 rounded-lg shadow`}>{m.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={sendChat} className="p-4 border-t bg-white">
              <div className="flex items-center gap-3">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Ask about parking..."
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" disabled={chatLoading} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60">
                  {chatLoading ? "..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <h2 className="text-3xl font-semibold text-cyan-600 mb-6">
          {activeTab === "slots" ? "Available Slots" : "Your Booked Tickets"}
        </h2>

        {/* Notification */}
        {notification && (
          <div
            className={`p-3 mb-4 rounded-lg text-center ${
              notification.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {notification}
          </div>
        )}

        {/* Available Slots */}
        {activeTab === "slots" && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.lot_no}
                onClick={() =>
                  !slot.isTaken ? setSelectedSlot(slot.lot_no) : null
                }
                className={`p-6 text-center rounded-xl cursor-pointer shadow-md transition ${
                  slot.isTaken
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-cyan-100 hover:bg-cyan-200 text-cyan-800"
                }`}
              >
                <p className="text-xl font-bold">{slot.lot_no}</p>
                <p className="text-sm mt-1">
                  {slot.isTaken ? "Occupied" : "Available"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[400px]">
              <h3 className="text-xl font-semibold text-cyan-600 mb-4">
                Book Slot {selectedSlot}
              </h3>
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Parked Till
                  </label>
                  <input
                    type="datetime-local"
                    value={parkedTill}
                    onChange={(e) => setParkedTill(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
                      loading
                        ? "bg-cyan-300 cursor-not-allowed"
                        : "bg-cyan-500 hover:bg-cyan-600"
                    }`}
                  >
                    {loading ? "Booking..." : "Confirm"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Booked Tickets */}
        {activeTab === "bookings" && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow-lg">
              <thead className="bg-cyan-500 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Slot No</th>
                  <th className="py-3 px-4 text-left">Vehicle</th>
                  <th className="py-3 px-4 text-left">Parked Till</th>
                  <th className="py-3 px-4 text-left">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => {
                  const qrData = `http://10.73.150.23:5173/admin?slot_no=${
                    b.slot_no
                  }&name=${encodeURIComponent(
                    user.name
                  )}&parked_till=${encodeURIComponent(
                    b.parked_till
                  )}&vehicle_number=${encodeURIComponent(b.vehicle_number)}`;
                  return (
                    <tr
                      key={index}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="py-3 px-4">{b.slot_no}</td>
                      <td className="py-3 px-4">{b.vehicle_number}</td>
                      <td className="py-3 px-4">
                        {new Date(b.parked_till).toLocaleString()}
                      </td>
                      <td
                        className="py-3 px-4 cursor-pointer"
                        onClick={() =>
                          setQrModal({
                            slot_no: b.slot_no,
                            name: user.name,
                            parked_till: b.parked_till,
                            vehicle_number: b.vehicle_number,
                            qrData,
                          })
                        }
                      >
                        <QRCodeCanvas value={qrData} size={80} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* QR Modal */}
        {qrModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center relative w-[380px]">
              <button
                onClick={() => setQrModal(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold text-cyan-600 mb-4">
                QR Ticket
              </h3>
              <QRCodeCanvas value={qrModal.qrData} size={200} />
              <div className="mt-4 text-slate-700 text-sm space-y-1">
                <p>
                  <span className="font-semibold">Slot:</span>{" "}
                  {qrModal.slot_no}
                </p>
                <p>
                  <span className="font-semibold">Vehicle:</span>{" "}
                  {qrModal.vehicle_number}
                </p>
                <p>
                  <span className="font-semibold">Parked Till:</span>{" "}
                  {new Date(qrModal.parked_till).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
