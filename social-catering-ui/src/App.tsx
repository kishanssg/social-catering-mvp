import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(module => ({ default: module.EventsPage })));
const EventCreatePage = lazy(() => import('./pages/Events/CreateEventWizard'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then(module => ({ default: module.EventDetailPage })));
const StaffingPage = lazy(() => import('./pages/StaffingPage').then(module => ({ default: module.StaffingPage })));
const WorkersPage = lazy(() => import('./pages/WorkersPage').then(module => ({ default: module.WorkersPage })));
const WorkerCreatePage = lazy(() => import('./pages/WorkerCreatePage').then(module => ({ default: module.WorkerCreatePage })));
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage').then(module => ({ default: module.WorkerDetailPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })));

// Test pages (keep for development)
const TestApiIntegration = lazy(() => import('./components/TestApiIntegration'));
const TestWizard = lazy(() => import('./components/TestWizard'));
const SimpleTest = lazy(() => import('./components/SimpleTest'));
const WorkingWizard = lazy(() => import('./components/WorkingWizard'));
const ApiTest = lazy(() => import('./components/ApiTest'));
const WorkersPageEnhanced = lazy(() => import('./pages/Workers/WorkersPageEnhanced'));
const TestEnhancedTable = lazy(() => import('./components/TestEnhancedTable'));
const TimesheetPage = lazy(() => import('./pages/Reports/TimesheetPage'));
const TestDashboard = lazy(() => import('./components/TestDashboard'));
const TestShiftStatus = lazy(() => import('./components/TestShiftStatus'));
const TestBulkHours = lazy(() => import('./components/TestBulkHours'));
const DebugApi = lazy(() => import('./components/DebugApi'));
const TestDashboardNew = lazy(() => import('./components/TestDashboardNew'));
const SimplifiedDashboardPage = lazy(() => import('./pages/SimplifiedDashboardPage'));
const TestSimplifiedDashboard = lazy(() => import('./components/TestSimplifiedDashboard'));
const TestWorkersData = lazy(() => import('./pages/TestWorkersData'));

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
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Events (formerly Jobs) */}
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/create" element={<EventCreatePage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/events/:id/edit" element={<EventCreatePage />} />
              
              {/* Staffing (formerly Assignments) */}
              <Route path="/staffing" element={<StaffingPage />} />
              
              {/* Workers */}
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/workers/create" element={<WorkerCreatePage />} />
              <Route path="/workers/:id" element={<WorkerDetailPage />} />
              <Route path="/workers/:id/edit" element={<WorkerCreatePage />} />
              
              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/timesheet" element={<TimesheetPage />} />
              
              {/* Backward compatibility - old routes redirect to new */}
              <Route path="/jobs" element={<Navigate to="/events" replace />} />
              <Route path="/jobs/create" element={<Navigate to="/events/create" replace />} />
              <Route path="/jobs/:id" element={<Navigate to="/events/:id" replace />} />
              <Route path="/assignments" element={<Navigate to="/staffing" replace />} />
            </Route>
            
            {/* Test routes (no auth required for development) */}
            <Route path="/test-api" element={<TestApiIntegration />} />
            <Route path="/test-wizard" element={<TestWizard />} />
            <Route path="/simple-test" element={<SimpleTest />} />
            <Route path="/working-wizard" element={<WorkingWizard />} />
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="/workers-enhanced" element={<WorkersPageEnhanced />} />
            <Route path="/test-table" element={<TestEnhancedTable />} />
            <Route path="/test-dashboard" element={<TestDashboard />} />
            <Route path="/test-shift-status" element={<TestShiftStatus />} />
            <Route path="/test-bulk-hours" element={<TestBulkHours />} />
            <Route path="/debug-api" element={<DebugApi />} />
            <Route path="/test-dashboard-new" element={<TestDashboardNew />} />
            <Route path="/test-simplified-dashboard" element={<SimplifiedDashboardPage />} />
            <Route path="/test-simplified-dashboard-components" element={<TestSimplifiedDashboard />} />
            <Route path="/test-workers-data" element={<TestWorkersData />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;