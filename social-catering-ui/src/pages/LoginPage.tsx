import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { X, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Error message mapping for better UX
const getLoginErrorMessage = (error: any): string => {
  const statusCode = error?.response?.status || error?.status
  const errorData = error?.response?.data || error?.data || {}
  const errorMessage = error?.message || errorData?.message || errorData?.error || ''
  
  // Check for specific error codes/messages from backend
  if (statusCode === 401) {
    const errorText = errorMessage.toLowerCase()
    if (errorText.includes('email') || errorText.includes('not found') || errorText.includes('doesn\'t exist')) {
      return 'No account found with this email address.'
    }
    if (errorText.includes('password') || errorText.includes('incorrect')) {
      return 'Incorrect password. Please try again.'
    }
    return 'Invalid email or password. Please check your credentials.'
  }
  
  if (statusCode === 429) {
    return 'Too many login attempts. Please wait a few minutes and try again.'
  }
  
  if (statusCode === 403) {
    return 'This account has been locked. Please contact support.'
  }
  
  if (statusCode >= 500) {
    return 'Unable to connect to the server. Please try again later.'
  }
  
  // Default message
  return errorMessage || 'Invalid email or password. Please try again.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const errorRef = useRef<string>('') // Persistent error storage (in-memory)
  const isMountedRef = useRef(true)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorSetTimeRef = useRef<number>(0) // For time-locking clears
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef<boolean>(false)
  
  // Get the redirect path from location state, default to dashboard
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    isMountedRef.current = true
    // Restore persisted error from localStorage first, then ref
    const persisted = localStorage.getItem('loginError') || ''
    if (persisted && !apiError) {
      console.log('🔄 Restoring error from storage:', persisted)
      errorRef.current = persisted
      setApiError(persisted)
    } else if (errorRef.current && !apiError) {
      console.log('🔄 Restoring error from ref:', errorRef.current)
      setApiError(errorRef.current)
    }
    return () => {
      isMountedRef.current = false
      // Clear any pending timeouts on unmount
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])
  
  // Debug: Log when apiError changes AND track what cleared it
  useEffect(() => {
    if (apiError) {
      console.log('🔴 Login error set:', apiError)
      errorRef.current = apiError // Store in ref for persistence
      errorSetTimeRef.current = Date.now()
      try { localStorage.setItem('loginError', apiError) } catch {}
    } else {
      console.log('🟢 Login error cleared - stack trace:', new Error().stack)
      errorRef.current = '' // Clear ref too
      try { localStorage.removeItem('loginError') } catch {}
    }
  }, [apiError])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Register password with ref callback
  const passwordRegister = register('password')

  // For potential future use: track values, but do not auto-clear on typing
  const emailValue = watch('email')
  const passwordValue = watch('password')

  const onSubmit = async (data: LoginFormData) => {
    // Guard against duplicate submissions
    if (isLoading || submittingRef.current) {
      console.log('Login submit ignored (already submitting)')
      return
    }
    submittingRef.current = true
    try {
      setIsLoading(true)
      // Clear previous errors when starting new login attempt (respect lock not needed here)
      errorRef.current = ''
      setApiError('')

      // Track attempted email for helper text
      try { localStorage.setItem('attemptedEmail', data.email.trim()) } catch {}
      await login(data.email, data.password)
      // Only clear error on successful login
      if (isMountedRef.current) {
        errorRef.current = ''
        setApiError('')
        navigate(redirectTo)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        // Use error mapping function for better messages
        const errorMessage = getLoginErrorMessage(err)
        errorRef.current = errorMessage
        setApiError(errorMessage)
        
        // Focus password field after error (for better UX)
        setTimeout(() => {
          passwordInputRef.current?.focus()
        }, 100)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      submittingRef.current = false
    }
  }
  
  // Clear error when user explicitly dismisses it
  const dismissError = () => {
    // Enforce a minimum visible duration of 2s before allowing dismiss
    const elapsed = Date.now() - (errorSetTimeRef.current || 0)
    if (errorRef.current && elapsed < 2000) {
      console.log(`⏰ Error locked for ${(2000 - elapsed)}ms more`)
      return
    }
    errorRef.current = ''
    setApiError('')
    try {
      localStorage.removeItem('loginError')
      localStorage.removeItem('attemptedEmail')
    } catch {}
  }
  
  // Display error from ref if state is empty (defensive)
  const displayError = apiError || errorRef.current
  const hasError = !!displayError


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with Logo */}
        <div className="text-center">
          {/* Professional Logo */}
          <div className="mb-8">
                <img 
                  src="/sc_logo.png"
                  srcSet="/sc_logo.png 1x, /sc_logo@2x.png 2x, /sc_logo@3x.png 3x"
                  alt="Social Catering" 
                  className="mx-auto h-14 w-auto"
                  loading="eager"
                  decoding="async"
                  style={{ 
                    imageRendering: 'auto'
                  }}
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
          <form 
            className="space-y-6" 
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            autoComplete="off"
            onKeyDown={(e) => {
              if (isLoading && e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
          {/* Persistent Error Alert - Stays until dismissed or user types */}
          {displayError && (
            <div 
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              id="login-error"
              className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg animate-shake"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-red-800">Login Failed</h3>
                  </div>
                  <p className="text-sm text-red-700 ml-7 font-medium">{displayError}</p>
                  <p className="text-xs text-red-600 ml-7 mt-1">
                    Please check your credentials and try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissError}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded p-1 transition-colors flex-shrink-0"
                  aria-label="Dismiss error"
                  title="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Helpful Hints */}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Common issues:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Make sure you're using your full email address (including @socialcatering.com)</li>
                  <li>Passwords are case-sensitive</li>
                  <li>Try copying and pasting your password to avoid typos</li>
                  {displayError.toLowerCase().includes('email') && (
                    <li className="font-semibold text-red-700">The email address you entered doesn't exist in our system</li>
                  )}
                  {displayError.toLowerCase().includes('locked') && (
                    <li className="font-semibold text-red-700">Contact your administrator to unlock your account</li>
                  )}
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  Need help? Contact <a href="mailto:support@socialcatering.com" className="underline font-medium">support@socialcatering.com</a>
                </p>
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
                aria-invalid={hasError || errors.email ? 'true' : 'false'}
                aria-describedby={hasError ? 'login-error' : errors.email ? 'email-error' : undefined}
                className={`mt-1 input-field ${
                  hasError || errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="you@socialcatering.com"
                onFocus={() => {
                  if (displayError) {
                    const elapsed = Date.now() - (errorSetTimeRef.current || 0)
                    if (elapsed > 2000) {
                      errorRef.current = ''
                      setApiError('')
                      try { localStorage.removeItem('loginError') } catch {}
                    } else {
                      console.log('⏰ Keeping error visible on email focus (within lock)')
                    }
                  }
                }}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
                aria-invalid={hasError || errors.password ? 'true' : 'false'}
                aria-describedby={hasError ? 'login-error' : errors.password ? 'password-error' : undefined}
                className={`mt-1 input-field ${
                  hasError || errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                {...passwordRegister}
                onFocus={() => {
                  if (displayError) {
                    const elapsed = Date.now() - (errorSetTimeRef.current || 0)
                    if (elapsed > 2000) {
                      errorRef.current = ''
                      setApiError('')
                      try { localStorage.removeItem('loginError') } catch {}
                    } else {
                      console.log('⏰ Keeping error visible on password focus (within lock)')
                    }
                  }
                }}
                ref={(e) => {
                  passwordRegister.ref(e)
                  passwordInputRef.current = e
                }}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              onClick={(e) => {
                if (isLoading || submittingRef.current) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
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

          {/* Helper text for admin accounts (staging/dev only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 text-center">
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer hover:text-gray-800 font-medium">
                  Need help logging in?
                </summary>
                <div className="mt-3 text-left bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-gray-900">Admin accounts:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>natalie@socialcatering.com</li>
                    <li>madison@socialcatering.com</li>
                    <li>sarah@socialcatering.com</li>
                    <li>gravyadmin@socialcatering.com</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3">
                    Initial password: <code className="bg-gray-200 px-2 py-0.5 rounded">password123</code>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">⚠️ Change your password after first login</p>
                  <p className="text-xs text-gray-500 mt-2">Forgot password? Contact system administrator.</p>
                </div>
              </details>
            </div>
          )}

          </form>
        </div>
      </div>
    </div>
  )
}
