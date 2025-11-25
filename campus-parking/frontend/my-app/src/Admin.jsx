import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Admin() {
  const [searchParams] = useSearchParams();
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://campusparkingbackend.azurewebsites.net/";

  const slot_no = searchParams.get("slot_no");
  const name = searchParams.get("name");
  const parked_till = searchParams.get("parked_till");
  const vehicle_number = searchParams.get("vehicle_number");

  const handleValidate = async () => {
    setLoading(true);
    setValidationResult(null);

    try {
      const res = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_no,
          name,
          parked_till,
          vehicle_number,
        }),
      });

      const data = await res.json();
      setValidationResult(data);
    } catch (err) {
      setValidationResult({ status: "Failed", message: "Server Error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-[400px] text-center border border-gray-100">
        <h2 className="text-3xl font-bold text-cyan-600 mb-4">
          Ticket Validation
        </h2>

        {slot_no && name && parked_till && vehicle_number ? (
          <>
            <div className="text-left text-slate-700 mb-6 space-y-2">
              <p>
                <span className="font-semibold">Slot No:</span> {slot_no}
              </p>
              <p>
                <span className="font-semibold">Name:</span> {name}
              </p>
              <p>
                <span className="font-semibold">Vehicle:</span> {vehicle_number}
              </p>
              <p>
                <span className="font-semibold">Parked Till:</span>{" "}
                {new Date(parked_till).toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleValidate}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                loading
                  ? "bg-cyan-300 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-600"
              }`}
            >
              {loading ? "Validating..." : "Validate Ticket"}
            </button>

            {validationResult && (
              <div
                className={`mt-6 p-3 rounded-lg text-sm font-semibold ${
                  validationResult.status === "Success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {validationResult.message}
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500">
            Invalid or missing QR data.  
            Please scan a valid ticket.
          </p>
        )}
      </div>
    </div>
  );
}
