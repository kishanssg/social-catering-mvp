import React from 'react';

interface SimpleStatCardProps {
  label: string;
  value: number;
  isHero?: boolean; // For "Gaps to Fill"
  onClick?: () => void;
}

export function SimpleStatCard({ label, value, isHero, onClick }: SimpleStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-lg border p-6 transition-all duration-200
        ${isHero 
          ? 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-lg' 
          : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Pulse animation for hero card with high values */}
      {isHero && value > 5 && (
        <div className="absolute top-0 right-0 w-3 h-3 m-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
      
      <div className="flex flex-col">
        <span className={`text-sm font-medium mb-1 ${isHero ? 'text-red-700' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className={`text-4xl font-bold ${isHero ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </span>
      </div>
      
      {isHero && value > 0 && (
        <div className="mt-2 text-xs font-medium text-red-600">
          {value === 1 ? 'Requires immediate attention' : 'Require immediate attention'}
        </div>
      )}
    </div>
  );
}

