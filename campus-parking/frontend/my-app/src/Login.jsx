import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

// Sample credentials - simulating database with admin column
const SAMPLE_CREDENTIALS = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@campus.edu',
    isAdmin: true
  },
  {
    username: 'user',
    password: 'user123',
    email: 'user@campus.edu',
    isAdmin: false
  },
  {
    username: 'john',
    password: 'john123',
    email: 'john@campus.edu',
    isAdmin: false
  }
]

function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      setLoading(false)
      
      // Find user in credentials array (simulating database lookup)
      const user = SAMPLE_CREDENTIALS.find(
        cred => cred.username === formData.username && cred.password === formData.password
      )
      
      if (user) {
        // Store user information in cookies
        Cookies.set('username', user.username, { expires: 7 }) // 7 days
        Cookies.set('email', user.email, { expires: 7 })
        Cookies.set('isAuthenticated', 'true', { expires: 7 })
        Cookies.set('isAdmin', user.isAdmin.toString(), { expires: 7 })
        
        // Navigate based on admin status
        if (user.isAdmin) {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
      } else {
        setErrors({ form: 'Invalid username or password' })
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Campus Parking Management System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.form && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.form}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Sample Credentials:</h3>
            <div className="space-y-1">
              <p className="text-xs text-blue-600"><strong>Admin:</strong> admin / admin123</p>
              <p className="text-xs text-blue-600"><strong>User:</strong> user / user123</p>
              <p className="text-xs text-blue-600"><strong>User:</strong> john / john123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
