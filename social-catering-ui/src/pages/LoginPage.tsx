import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { X } from 'lucide-react'
import scLogo from '../assets/icons/sc_logo.png'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const isMountedRef = useRef(true)
  
  // Get the redirect path from location state, default to dashboard
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setApiError('')

      await login(data.email, data.password)
      if (isMountedRef.current) {
        navigate(redirectTo)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setApiError(err.message || 'Login failed. Please try again.')
        // Keep error visible for at least 5 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            // Error will remain visible until user dismisses it or submits again
          }
        }, 5000)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }
  
  // Clear error when user starts typing
  const handleInputChange = () => {
    if (apiError) {
      setApiError('')
    }
  }
  
  const dismissError = () => {
    setApiError('')
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with Logo */}
        <div className="text-center">
          {/* Professional Logo */}
          <div className="mb-8">
            <img 
              src={scLogo} 
              alt="Social Catering" 
              className="mx-auto h-20 w-auto"
              width={198}
              height={55}
              loading="eager"
              decoding="async"
            />
          </div>
          
          {/* Tagline */}
          <p className="text-lg text-gray-600 font-medium">
            Workforce Management System
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to manage your team and events
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* API Error - Persistent with dismiss button */}
          {apiError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-sm font-semibold text-red-800">Login Failed</h3>
                  </div>
                  <p className="text-sm text-red-700 ml-7">{apiError}</p>
                </div>
                <button
                  type="button"
                  onClick={dismissError}
                  className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`mt-1 input-field ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder="test@example.com"
                {...register('email', {
                  onChange: handleInputChange
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`mt-1 input-field ${
                  errors.password ? 'border-red-500' : ''
                }`}
                placeholder="password"
                {...register('password', {
                  onChange: handleInputChange
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          </form>
        </div>
      </div>
    </div>
  )
}
