# app.py
import os
import uuid
from flask import Flask, render_template, jsonify, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
import qrcode

app = Flask(__name__)

# CONFIG: DATABASE_URL environment variable (production). Fallback to sqlite for dev/demo.
# Example production value (for Azure): mssql+pyodbc://<user>:<pass>@<server>:1433/<db>?driver=ODBC+Driver+18+for+SQL+Server
DATABASE_URL = os.environ.get("DATABASE_URL")
USE_LOCAL_DB = os.environ.get("USE_LOCAL_DB", "true").lower() in ("1", "true", "yes")

if DATABASE_URL and not USE_LOCAL_DB:
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # fallback to sqlite in-app for a stable demo without external DB/firewall issues
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///parking.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class ParkingSlot(db.Model):
    __tablename__ = "parking_slots"
    id = db.Column(db.Integer, primary_key=True)
    slot_id = db.Column(db.String(10), unique=True, nullable=False)
    booking_id = db.Column(db.String(64), nullable=True)

    def to_dict(self):
        return {
            "slot_id": self.slot_id,
            "booking_id": self.booking_id,
            "status": "Available" if not self.booking_id else "Booked"
        }

def ensure_default_slots():
    # safe to call on startup; wrap in try/except so it won't crash the worker if DB unreachable
    try:
        default_slots = ["A1", "A2", "B1", "B2", "C1"]
        for s in default_slots:
            if not ParkingSlot.query.filter_by(slot_id=s).first():
                db.session.add(ParkingSlot(slot_id=s))
        db.session.commit()
    except Exception as e:
        # log and continue; app can still serve and retry later
        app.logger.warning(f"Could not initialize default slots (db may be unavailable): {e}")
        db.session.rollback()

# create tables on startup but don't let failure kill the app
with app.app_context():
    try:
        db.create_all()
        ensure_default_slots()
    except Exception as e:
        app.logger.warning(f"DB create_all failed at startup: {e}")

# UI routes
@app.route('/')
def home():
    # Show index page with slots (converted to list of dicts for templates)
    slots = ParkingSlot.query.all()
    slots_data = [s.to_dict() for s in slots]
    return render_template('index.html', slots=slots_data)

@app.route('/parking')
def parking_page():
    slots = ParkingSlot.query.all()
    slots_data = [s.to_dict() for s in slots]
    return render_template('parking.html', slots=slots_data)

@app.route('/admin')
def admin_dashboard():
    slots = ParkingSlot.query.all()
    return render_template('admin.html', slots=slots)

# Booking routes (UI)
@app.route('/book/<slot_id>')
def book_slot(slot_id):
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if slot and not slot.booking_id:
        booking_id = str(uuid.uuid4())[:8]
        qr_data = f"Slot: {slot_id}, BookingID: {booking_id}"
        img = qrcode.make(qr_data)
        os.makedirs("static/qr_codes", exist_ok=True)
        qr_path = os.path.join("static/qr_codes", f"{booking_id}.png")
        img.save(qr_path)
        slot.booking_id = booking_id
        db.session.commit()
    return redirect(url_for('home'))

@app.route('/release/<slot_id>')
def release_slot(slot_id):
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if slot and slot.booking_id:
        slot.booking_id = None
        db.session.commit()
    return redirect(url_for('home'))

# --- REST API endpoints for frontend integration ---
# GET /api/slots -> list all slots and status
@app.route('/api/slots', methods=['GET'])
def api_get_slots():
    slots = ParkingSlot.query.all()
    return jsonify([s.to_dict() for s in slots])

# POST /api/book { "slot_id": "A1" } -> book slot
@app.route('/api/book', methods=['POST'])
def api_book():
    data = request.get_json() or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"error": "slot_id required"}), 400
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if not slot:
        return jsonify({"error": "slot not found"}), 404
    if slot.booking_id:
        return jsonify({"error": "slot already booked"}), 400
    booking_id = str(uuid.uuid4())[:8]
    slot.booking_id = booking_id
    db.session.commit()
    # save QR
    qr_data = f"Slot: {slot_id}, BookingID: {booking_id}"
    img = qrcode.make(qr_data)
    os.makedirs("static/qr_codes", exist_ok=True)
    qr_path = os.path.join("static/qr_codes", f"{booking_id}.png")
    img.save(qr_path)
    return jsonify({"slot": slot_id, "booking_id": booking_id, "qr_path": qr_path})

# POST /api/release { "slot_id": "A1" } -> release
@app.route('/api/release', methods=['POST'])
def api_release():
    data = request.get_json() or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"error": "slot_id required"}), 400
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if not slot:
        return jsonify({"error": "slot not found"}), 404
    if not slot.booking_id:
        return jsonify({"error": "slot not booked"}), 400
    slot.booking_id = None
    db.session.commit()
    return jsonify({"message": f"Slot {slot_id} released"})

# GET /api/booking/<booking_id> -> fetch booking info (optional)
@app.route('/api/booking/<booking_id>', methods=['GET'])
def api_get_booking(booking_id):
    slot = ParkingSlot.query.filter_by(booking_id=booking_id).first()
    if not slot:
        return jsonify({"error": "booking not found"}), 404
    return jsonify({"slot_id": slot.slot_id, "booking_id": slot.booking_id})

# Health check
@app.route('/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 8000)), debug=True)
