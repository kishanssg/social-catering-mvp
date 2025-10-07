import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">{user?.email}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Social Catering! 🎉</h2>
            <p className="text-gray-600 mb-4">
              You're successfully logged in as <strong>{user?.email}</strong>
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ Authentication Working!</p>
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                <li>• Session cookie authentication ✅</li>
                <li>• Protected routes ✅</li>
                <li>• Logout functionality ✅</li>
                <li>• Session persistence ✅</li>
              </ul>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              <p>Next steps: Build dashboard widgets (Day 6-7)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
