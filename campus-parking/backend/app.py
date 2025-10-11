from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
import qrcode
import os
import uuid

app = Flask(__name__)

# Configure SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///parking.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define ParkingSlot model
class ParkingSlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slot_id = db.Column(db.String(10), unique=True, nullable=False)
    booking_id = db.Column(db.String(50), nullable=True)

# Initialize database
with app.app_context():
    db.create_all()
    default_slots = ["A1", "A2", "B1", "B2", "C1"]
    for s in default_slots:
        if not ParkingSlot.query.filter_by(slot_id=s).first():
            db.session.add(ParkingSlot(slot_id=s))
    db.session.commit()

# Home Page
@app.route('/')
def home():
    slots = ParkingSlot.query.all()
    return render_template('index.html', slots=slots)

# Book a Slot (UI)
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

# Release a Slot (UI)
@app.route('/release/<slot_id>')
def release_slot(slot_id):
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if slot and slot.booking_id:
        slot.booking_id = None
        db.session.commit()
    return redirect(url_for('home'))

# Admin Dashboard
@app.route('/admin')
def admin_dashboard():
    slots = ParkingSlot.query.all()
    return render_template('admin.html', slots=slots)

# API ENDPOINTS for React Frontend

# Get all slots
@app.route('/api/slots', methods=['GET'])
def get_slots():
    slots = ParkingSlot.query.all()
    result = [{"slot_id": s.slot_id, "booking_id": s.booking_id} for s in slots]
    return jsonify(result)

# Create booking
@app.route('/api/book', methods=['POST'])
def api_book_slot():
    data = request.json
    slot_id = data.get("slot_id")
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if not slot:
        return jsonify({"error": "Invalid slot"}), 400
    if slot.booking_id:
        return jsonify({"error": "Slot already booked"}), 400

    booking_id = str(uuid.uuid4())[:8]
    slot.booking_id = booking_id
    db.session.commit()
    return jsonify({"slot_id": slot_id, "booking_id": booking_id})

# Release booking
@app.route('/api/release', methods=['POST'])
def api_release_slot():
    data = request.json
    slot_id = data.get("slot_id")
    slot = ParkingSlot.query.filter_by(slot_id=slot_id).first()
    if not slot:
        return jsonify({"error": "Invalid slot"}), 400
    if not slot.booking_id:
        return jsonify({"error": "Slot is not booked"}), 400

    slot.booking_id = None
    db.session.commit()
    return jsonify({"message": f"Slot {slot_id} released"})

# Parking Page
@app.route('/parking')
def parking_page():
    slots = ParkingSlot.query.all()
    return render_template('parking.html', slots=slots)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
