import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, FileText, Menu } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="grid grid-cols-5 h-16">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => navigate('/events')}
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/events') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs">Events</span>
        </button>

        <button
          onClick={() => navigate('/workers')}
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/workers') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs">Workers</span>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/reports') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Reports</span>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center gap-1 text-gray-600"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs">More</span>
        </button>
      </div>
    </nav>
  );
}
