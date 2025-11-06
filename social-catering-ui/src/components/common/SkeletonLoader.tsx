import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

export function SkeletonLoader({ className = '', count = 1 }: SkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
        />
      ))}
    </>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <SkeletonLoader className="h-6 w-48 mb-2" />
            <SkeletonLoader className="h-4 w-32" />
          </div>
          <SkeletonLoader className="h-8 w-8 rounded-full" />
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <SkeletonLoader className="h-4 w-4 rounded" />
            <SkeletonLoader className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonLoader className="h-4 w-4 rounded" />
            <SkeletonLoader className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonLoader className="h-4 w-4 rounded" />
            <SkeletonLoader className="h-4 w-32" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <SkeletonLoader className="h-2 w-full rounded-full mb-2" />
          <SkeletonLoader className="h-3 w-24" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <SkeletonLoader className="h-9 w-24 rounded-md" />
          <SkeletonLoader className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

