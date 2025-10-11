import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardLayout } from './components/Layout/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkersPage } from './pages/WorkersPage'
import WorkerDetail from './pages/WorkerDetail'
import ShiftsList from './pages/ShiftsList'
import ShiftDetail from './pages/ShiftDetail'
import ShiftForm from './pages/ShiftForm'
import AssignmentsList from './pages/AssignmentsList'
import WorkerSchedule from './pages/WorkerSchedule'
import CalendarView from './pages/CalendarView'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes with layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Worker management */}
          <Route
            path="/workers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkerDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id/schedule"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkerSchedule />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Shifts management */}
          <Route
            path="/shifts"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ShiftsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shifts/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ShiftForm />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shifts/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ShiftDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shifts/:id/edit"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ShiftForm />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Assignments management */}
          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AssignmentsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id/schedule"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkerSchedule />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Calendar view */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CalendarView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
                    <p className="text-gray-600 mt-2">Coming soon (Day 15)</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App