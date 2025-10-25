import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
const WorkersPage = lazy(() => import('./pages/WorkersPage').then(module => ({ default: module.WorkersPage })));
const WorkerCreatePage = lazy(() => import('./pages/WorkerCreatePage').then(module => ({ default: module.WorkerCreatePage })));
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage').then(module => ({ default: module.WorkerDetailPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })));

// Additional pages
const TimesheetPage = lazy(() => import('./pages/Reports/TimesheetPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <div className="text-gray-500 mt-4">Loading...</div>
    </div>
  </div>
);

// Component to handle zoom logic
function ZoomHandler() {
  const location = useLocation();
  
  useEffect(() => {
    const adjustZoomForScreen = () => {
      // Don't apply zoom on login page
      if (location.pathname === '/login') {
        document.body.style.zoom = '1';
        return;
      }
      
      const screenWidth = window.innerWidth;
      let zoom = 1.0;
      
      // Your external monitor (baseline)
      if (screenWidth >= 1920) {
        zoom = 1.0;
      }
      // Mid-size monitors (1440p)
      else if (screenWidth >= 1440) {
        zoom = 0.9;
      }
      // 13-15" laptops (like MacBook Pro 13")
      else if (screenWidth >= 1280) {
        zoom = 0.8;
      }
      // Smaller screens
      else if (screenWidth >= 1024) {
        zoom = 0.7;
      }
      // Very small screens (minimum)
      else {
        zoom = 0.65;
      }
      
      // Apply the zoom
      document.body.style.zoom = zoom.toString();
      
      // Optional: Log for debugging
      console.log(`Screen width: ${screenWidth}px, Applied zoom: ${zoom}`);
    };
    
    // Run on mount
    adjustZoomForScreen();
    
    // Re-run when window is resized (e.g., when you disconnect monitor)
    window.addEventListener('resize', adjustZoomForScreen);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', adjustZoomForScreen);
    };
  }, [location.pathname]); // Re-run when route changes
  
  return null; // This component doesn't render anything
}

function App() {
  return (
    <BrowserRouter>
      <ZoomHandler />
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