import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function Header() {
  const { user, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-6 pl-16 lg:pl-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      </div>

      {/* User Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* User Avatar */}
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.email.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Email */}
          <span className="text-sm font-medium text-gray-700">{user?.email}</span>

          {/* Dropdown Icon */}
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
