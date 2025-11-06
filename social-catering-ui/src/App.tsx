import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(module => ({ default: module.EventsPage })));
const EventCreatePage = lazy(() => import('./pages/Events/CreateEventWizard'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then(module => ({ default: module.EventDetailPage })));
const WorkersPage = lazy(() => import('./pages/WorkersPage').then(module => ({ default: module.WorkersPage })));
const WorkerCreatePage = lazy(() => import('./pages/WorkerCreatePage').then(module => ({ default: module.WorkerCreatePage })));
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage').then(module => ({ default: module.WorkerDetailPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })));

// Additional pages
const TimesheetPage = lazy(() => import('./pages/Reports/TimesheetPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLog').then(module => ({ default: module.ActivityLog })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <div className="text-gray-500 mt-4">Loading...</div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
            {/* All protected routes use the unified layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              
                  {/* Events (unified with staffing) */}
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/events/create" element={<EventCreatePage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/events/:id/edit" element={<EventCreatePage />} />
              
              {/* Workers */}
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/workers/create" element={<WorkerCreatePage />} />
              <Route path="/workers/:id" element={<WorkerDetailPage />} />
              <Route path="/workers/:id/edit" element={<WorkerCreatePage />} />
              
              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/timesheet" element={<TimesheetPage />} />
              
              {/* Activity Log */}
              <Route path="/activity-log" element={<ActivityLogPage />} />
              
              {/* Backward compatibility - old routes redirect to new */}
              <Route path="/jobs" element={<Navigate to="/events" replace />} />
              <Route path="/jobs/create" element={<Navigate to="/events/create" replace />} />
              <Route path="/jobs/:id" element={<Navigate to="/events/:id" replace />} />
              <Route path="/staffing" element={<Navigate to="/events?tab=active" replace />} />
              <Route path="/assignments" element={<Navigate to="/events?tab=active" replace />} />
            </Route>
            
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;