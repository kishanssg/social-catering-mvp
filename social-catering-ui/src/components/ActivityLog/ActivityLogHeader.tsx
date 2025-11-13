import React from 'react';
import { Search, X, FileText, Download } from 'lucide-react';
import { ActivityLog } from './utils/activityTypes';

interface ActivityLogHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalLogs: number;
  showingLogs: number;
  activities?: ActivityLog[];
}

export default function ActivityLogHeader({
  searchQuery,
  onSearchChange,
  totalLogs,
  showingLogs,
  activities = []
}: ActivityLogHeaderProps) {
  const handleExportCSV = () => {
    if (activities.length === 0) return;

    // CSV headers
    const headers = ['Date', 'Time', 'Actor', 'Action', 'Entity Type', 'Summary', 'Worker', 'Event', 'Role'];
    
    // Convert activities to CSV rows
    const rows = activities.map(activity => {
      const date = new Date(activity.created_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        activity.actor_name || 'System',
        activity.action,
        activity.entity_type,
        activity.summary,
        activity.details?.worker_name || '',
        activity.details?.event_name || '',
        activity.details?.role || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Title & Description */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" />
            Activity Log
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all actions and changes in the system
          </p>
        </div>

        {/* Stats & Export */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Total Logs: {totalLogs.toLocaleString()}</span>
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Search className="h-4 w-4" />
              <span className="font-medium">Showing: {showingLogs} of {totalLogs}</span>
            </div>
          )}
          {activities.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="font-medium">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by worker name, event name, or action..."
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Search hints */}
      {searchQuery && (
        <div className="mt-2 text-xs text-gray-500">
          💡 Tip: Search for "Charlie Williams" to see all activities for that worker, or "Wedding Reception" for all event activities
        </div>
      )}
    </div>
  );
}

