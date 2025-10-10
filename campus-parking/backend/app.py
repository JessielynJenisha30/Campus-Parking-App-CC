from flask import Flask, render_template, request, redirect, url_for
import qrcode
import os
import uuid

app = Flask(__name__)

parking_slots = {"A1": None, "A2": None, "B1": None, "B2": None, "C1": None}

@app.route('/')
def home():
    return render_template('index.html', slots=parking_slots)

@app.route('/book/<slot_id>')
def book_slot(slot_id):
    if parking_slots[slot_id] is None:
        booking_id = str(uuid.uuid4())[:8]
        qr_data = f"Slot: {slot_id}, BookingID: {booking_id}"
        img = qrcode.make(qr_data)
        qr_path = os.path.join("static/qr_codes", f"{booking_id}.png")
        os.makedirs("static/qr_codes", exist_ok=True)
        img.save(qr_path)
        parking_slots[slot_id] = booking_id
    return redirect(url_for('home'))

@app.route('/release/<slot_id>')
def release_slot(slot_id):
    if parking_slots[slot_id]:
        parking_slots[slot_id] = None
    return redirect(url_for('home'))

@app.route("/admin")
def admin_dashboard():
    return render_template("admin.html")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
