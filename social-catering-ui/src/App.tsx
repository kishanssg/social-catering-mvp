import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardLayout } from './components/Layout/DashboardLayout'
import { LoginPage } from './pages/LoginPage'

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const WorkersPage = lazy(() => import('./pages/WorkersPage').then(module => ({ default: module.WorkersPage })))
const WorkerDetail = lazy(() => import('./pages/WorkerDetail'))
const ShiftsList = lazy(() => import('./pages/ShiftsList'))
const ShiftDetail = lazy(() => import('./pages/ShiftDetail'))
const ShiftForm = lazy(() => import('./pages/ShiftForm'))
const AssignmentsList = lazy(() => import('./pages/AssignmentsList'))
const WorkerSchedule = lazy(() => import('./pages/WorkerSchedule'))
const CalendarView = lazy(() => import('./pages/CalendarView'))
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <div className="text-gray-500 mt-4">Loading...</div>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
                  <ActivityLogsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App