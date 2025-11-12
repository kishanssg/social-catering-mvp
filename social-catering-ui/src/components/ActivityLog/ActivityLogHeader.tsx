import React from 'react';
import { Search, X, FileText } from 'lucide-react';

interface ActivityLogHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalLogs: number;
  showingLogs: number;
}

export default function ActivityLogHeader({
  searchQuery,
  onSearchChange,
  totalLogs,
  showingLogs
}: ActivityLogHeaderProps) {
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

        {/* Stats */}
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

