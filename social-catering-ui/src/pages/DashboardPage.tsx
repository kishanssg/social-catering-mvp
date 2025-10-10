import { useDashboard } from '../hooks/useDashboard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { EmptyState } from '../components/Dashboard/EmptyState'
import { MetricCard } from '../components/Dashboard/MetricCard'
import { ShiftCard } from '../components/Dashboard/ShiftCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import { SkeletonShift } from '../components/ui/SkeletonShift'
import { format, parseISO } from 'date-fns'

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Title Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>

        {/* Skeleton Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Skeleton Fill Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-gray-200 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-gray-200 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-gray-200 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>

        {/* Skeleton Today's Shifts */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="space-y-4">
            <SkeletonShift />
            <SkeletonShift />
          </div>
        </div>

        {/* Skeleton Upcoming Shifts */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
          <div className="space-y-6">
            <div>
              <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse"></div>
              <div className="space-y-4">
                <SkeletonShift />
                <SkeletonShift />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />
  }

  // No Data
  if (!data) {
    return (
      <EmptyState
        title="No Dashboard Data"
        description="Unable to load dashboard information."
      />
    )
  }

  const { shift_counts, fill_status, today_shifts, upcoming_shifts } = data

  // Group upcoming shifts by date
  const groupedUpcoming = upcoming_shifts.reduce((acc, shift) => {
    const date = format(parseISO(shift.start_time_utc), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(shift)
    return acc
  }, {} as Record<string, typeof upcoming_shifts>)

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of shifts and assignments</p>
        </div>
        <button
          onClick={refetch}
          className="btn-secondary flex items-center space-x-2"
          aria-label="Refresh dashboard data"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Shift Count Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Draft Shifts"
          value={shift_counts.draft}
          color="gray"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        <MetricCard
          title="Published Shifts"
          value={shift_counts.published}
          color="blue"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <MetricCard
          title="Assigned Shifts"
          value={shift_counts.assigned}
          color="yellow"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <MetricCard
          title="Completed Shifts"
          value={shift_counts.completed}
          color="green"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Fill Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fill Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm text-gray-700">
              <strong>{fill_status.unfilled}</strong> Unfilled
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-700">
              <strong>{fill_status.partial}</strong> Partial
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-700">
              <strong>{fill_status.covered}</strong> Covered
            </span>
          </div>
        </div>
      </div>

      {/* Today's Shifts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Shifts ({today_shifts.length})
        </h2>
        {today_shifts.length > 0 ? (
          <div className="space-y-4">
            {today_shifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                clientName={shift.client_name}
                roleNeeded={shift.role_needed}
                startTimeUtc={shift.start_time_utc}
                endTimeUtc={shift.end_time_utc}
                capacity={shift.capacity}
                assignedCount={shift.assigned_count}
                workers={shift.workers}
                status={shift.status}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Shifts Today"
            description="There are no shifts scheduled for today."
            icon={
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
        )}
      </div>

      {/* Upcoming Shifts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Shifts (Next 7 Days)
        </h2>
        {upcoming_shifts.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedUpcoming).map(([date, shifts]) => (
              <div key={date}>
                <h3 className="text-md font-medium text-gray-700 mb-3">
                  {format(parseISO(date), 'EEEE, MMMM d')} ({shifts.length})
                </h3>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      clientName={shift.client_name}
                      roleNeeded={shift.role_needed}
                      startTimeUtc={shift.start_time_utc}
                      endTimeUtc={shift.end_time_utc}
                      capacity={shift.capacity}
                      assignedCount={shift.assigned_count}
                      workers={shift.workers}
                      status={shift.status}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Upcoming Shifts"
            description="There are no shifts scheduled for the next 7 days."
            icon={
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
        )}
      </div>
    </div>
  )
}