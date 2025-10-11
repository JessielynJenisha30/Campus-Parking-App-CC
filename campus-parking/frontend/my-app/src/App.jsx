import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import Admin from './Admin'
import Cookies from 'js-cookie'

// Protected Route Component for regular users
function ProtectedRoute({ children }) {
  const isAuthenticated = Cookies.get('isAuthenticated')
  const isAdmin = Cookies.get('isAdmin')
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If user is admin, redirect to admin panel
  if (isAdmin === 'true') {
    return <Navigate to="/admin" replace />
  }
  
  return children
}

// Protected Route Component for admin users
function AdminRoute({ children }) {
  const isAuthenticated = Cookies.get('isAuthenticated')
  const isAdmin = Cookies.get('isAdmin')
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If user is not admin, redirect to dashboard
  if (isAdmin !== 'true') {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Main App Component with Routing
export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Default route - redirect based on user type if authenticated, otherwise to login */}
          <Route 
            path="/" 
            element={
              Cookies.get('isAuthenticated') ? 
                (Cookies.get('isAdmin') === 'true' ? 
                  <Navigate to="/admin" replace /> : 
                  <Navigate to="/dashboard" replace />
                ) : 
                <Navigate to="/login" replace />
            } 
          />
          
          {/* Login route */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard route - protected for regular users */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin route - protected for admin users */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } 
          />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  )
}
