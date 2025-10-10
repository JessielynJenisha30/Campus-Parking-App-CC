import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

function Dashboard() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: ''
  })
  const [parkingSlots, setParkingSlots] = useState({})
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingForm, setBookingForm] = useState({
    vehicleNumber: '',
    parkingTime: '',
    duration: '',
    currentTime: ''
  })
  const [myBookings, setMyBookings] = useState([])
  const [showBookings, setShowBookings] = useState(false)
  const [showParkingInfo, setShowParkingInfo] = useState(false)

  // Initialize parking slots (1-30 slots)
  useEffect(() => {
    const initialSlots = {}
    for (let i = 1; i <= 30; i++) {
      initialSlots[i] = {
        id: i,
        available: true,
        bookedBy: null,
        vehicleNumber: null,
        startTime: null,
        endTime: null
      }
    }
    setParkingSlots(initialSlots)
    
    // Load existing bookings from localStorage
    const savedBookings = localStorage.getItem(`bookings_${userInfo.username}`)
    if (savedBookings) {
      setMyBookings(JSON.parse(savedBookings))
    }
  }, [userInfo.username])

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = Cookies.get('isAuthenticated')
    const username = Cookies.get('username')
    const email = Cookies.get('email')

    if (!isAuthenticated || !username) {
      // Redirect to login if not authenticated
      navigate('/login')
      return
    }

    // Set user info from cookies
    setUserInfo({
      username,
      email
    })
  }, [navigate])

  const handleLogout = () => {
    // Clear all cookies
    Cookies.remove('username')
    Cookies.remove('email')
    Cookies.remove('isAuthenticated')
    Cookies.remove('isAdmin')
    
    // Navigate to login
    navigate('/login')
  }

  const handleSlotClick = (slotId) => {
    if (parkingSlots[slotId].available) {
      setSelectedSlot(slotId)
      setShowBookingModal(true)
      // Set current time
      const now = new Date()
      setBookingForm({
        vehicleNumber: '',
        parkingTime: '',
        duration: '',
        currentTime: now.toLocaleString()
      })
    }
  }

  const handleBookingSubmit = (e) => {
    e.preventDefault()
    
    if (!bookingForm.vehicleNumber || !bookingForm.parkingTime || !bookingForm.duration) {
      alert('Please fill in all fields')
      return
    }

    // Calculate end time
    const startTime = new Date(bookingForm.parkingTime)
    const endTime = new Date(startTime.getTime() + (parseInt(bookingForm.duration) * 60 * 60 * 1000))

    // Create booking
    const booking = {
      id: Date.now(),
      slotId: selectedSlot,
      vehicleNumber: bookingForm.vehicleNumber,
      startTime: bookingForm.parkingTime,
      endTime: endTime.toISOString(),
      duration: bookingForm.duration,
      bookingTime: bookingForm.currentTime,
      username: userInfo.username
    }

    // Update parking slots
    setParkingSlots(prev => ({
      ...prev,
      [selectedSlot]: {
        ...prev[selectedSlot],
        available: false,
        bookedBy: userInfo.username,
        vehicleNumber: bookingForm.vehicleNumber,
        startTime: bookingForm.parkingTime,
        endTime: endTime.toISOString()
      }
    }))

    // Add to user bookings
    const newBookings = [...myBookings, booking]
    setMyBookings(newBookings)
    localStorage.setItem(`bookings_${userInfo.username}`, JSON.stringify(newBookings))

    // Close modal and reset form
    setShowBookingModal(false)
    setSelectedSlot(null)
    setBookingForm({
      vehicleNumber: '',
      parkingTime: '',
      duration: '',
      currentTime: ''
    })

    alert('Parking slot booked successfully!')
  }

  const cancelBooking = (bookingId) => {
    const booking = myBookings.find(b => b.id === bookingId)
    if (booking) {
      // Free up the slot
      setParkingSlots(prev => ({
        ...prev,
        [booking.slotId]: {
          ...prev[booking.slotId],
          available: true,
          bookedBy: null,
          vehicleNumber: null,
          startTime: null,
          endTime: null
        }
      }))

      // Remove from bookings
      const updatedBookings = myBookings.filter(b => b.id !== bookingId)
      setMyBookings(updatedBookings)
      localStorage.setItem(`bookings_${userInfo.username}`, JSON.stringify(updatedBookings))
    }
  }

  const ParkingSlot = ({ slotId, slot }) => (
    <div
      onClick={() => handleSlotClick(slotId)}
      className={`w-20 h-20 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
        slot.available
          ? 'border-green-500 bg-green-50 hover:bg-green-100 text-green-700'
          : 'border-red-500 bg-red-50 text-red-700 cursor-not-allowed'
      }`}
    >
      <div className="text-center">
        <div className="font-bold text-lg">{slotId}</div>
        <div className="text-xs">
          {slot.available ? 'Available' : 'Occupied'}
        </div>
      </div>
    </div>
  )

  const BookingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4">Book Parking Slot #{selectedSlot}</h3>
        <form onSubmit={handleBookingSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                value={bookingForm.vehicleNumber}
                onChange={(e) => setBookingForm({...bookingForm, vehicleNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter vehicle number"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking Time
              </label>
              <input
                type="datetime-local"
                value={bookingForm.parkingTime}
                onChange={(e) => setBookingForm({...bookingForm, parkingTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (hours)
              </label>
              <select
                value={bookingForm.duration}
                onChange={(e) => setBookingForm({...bookingForm, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select duration</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Time
              </label>
              <input
                type="text"
                value={bookingForm.currentTime}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Book Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Campus Parking Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowBookings(!showBookings)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                My Bookings ({myBookings.length})
              </button>
              <button
                onClick={() => setShowParkingInfo(!showParkingInfo)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
              >
                Parking Info
              </button>
              <span className="text-sm text-gray-700">
                Welcome, <strong>{userInfo.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* My Bookings Section */}
          {showBookings && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">My Bookings</h2>
              {myBookings.length === 0 ? (
                <p className="text-gray-500">No bookings found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBookings.map(booking => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">Slot #{booking.slotId}</h3>
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Vehicle:</strong> {booking.vehicleNumber}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Start:</strong> {new Date(booking.startTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Duration:</strong> {booking.duration} hours
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>End:</strong> {new Date(booking.endTime).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parking Info Section */}
          {showParkingInfo && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Parking Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Parking Rules</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Maximum parking duration: 24 hours</li>
                    <li>Parking fee: $2/hour</li>
                    <li>Late departure fee: $5/hour</li>
                    <li>No overnight parking without permission</li>
                    <li>Vehicles must display valid parking permit</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                  <p className="text-gray-600 mb-2">
                    <strong>Parking Office:</strong> (555) 123-4567
                  </p>
                  <p className="text-gray-600 mb-2">
                    <strong>Email:</strong> parking@campus.edu
                  </p>
                  <p className="text-gray-600">
                    <strong>Office Hours:</strong> 8:00 AM - 6:00 PM (Mon-Fri)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parking Slots Matrix */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Parking Slots</h2>
            
            {/* Legend */}
            <div className="flex items-center space-x-6 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Occupied</span>
              </div>
            </div>

            {/* Parking Slots Grid */}
            <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-4">
              {Object.entries(parkingSlots).map(([slotId, slot]) => (
                <ParkingSlot key={slotId} slotId={parseInt(slotId)} slot={slot} />
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Click on an available slot to book your parking space
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <BookingModal />}
    </div>
  )
}

export default Dashboard