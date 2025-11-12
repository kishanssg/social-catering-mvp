import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

interface EmptyStateProps {
  searchQuery: string;
  hasFilters: boolean;
}

export default function EmptyState({ searchQuery, hasFilters }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No results found for "{searchQuery}"
        </h3>
        <p className="text-sm text-gray-500">
          Try searching for a different worker name or event name
        </p>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No activities match your filters
        </h3>
        <p className="text-sm text-gray-500">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No activities yet
      </h3>
      <p className="text-sm text-gray-500">
        Activity logs will appear here as users make changes
      </p>
    </div>
  );
}

