import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../services/api'
import { apiClient } from '../lib/api'
import type { User } from '../types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setUser(user)
          
          // Verify session is still valid by trying to access a protected endpoint
          try {
            await apiClient.get('/workers')
            console.log('Session verified')
          } catch (error) {
            console.log('Session expired, clearing user')
            setUser(null)
            localStorage.removeItem('user')
          }
        } catch {
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }
    
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      const response = await apiService.login({ email, password }) as any
      
      console.log('Login response:', response) // Debug logging
      
      if (response.status === 'success' && response.data) {
        setUser(response.data.user)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        console.log('Login successful, user set:', response.data.user)
      } else {
        // Response came back but not in expected format
        console.error('Unexpected response format:', response)
        const errorMsg = response.error || 'Login failed - unexpected response'
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err?.response?.data?.error || err?.message || 'Login failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      localStorage.removeItem('user')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
