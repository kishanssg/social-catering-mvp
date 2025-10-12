import { format, parseISO } from 'date-fns'

interface Worker {
  id: number
  first_name: string
  last_name: string
}

interface ShiftCardProps {
  clientName: string
  roleNeeded: string
  startTimeUtc: string
  endTimeUtc: string
  capacity: number
  assignedCount: number
  workers: Worker[]
  status: string
}

export function ShiftCard({
  clientName,
  roleNeeded,
  startTimeUtc,
  endTimeUtc,
  capacity,
  assignedCount,
  workers,
}: ShiftCardProps) {
  // Format times
  const startTime = format(parseISO(startTimeUtc), 'h:mm a')
  const endTime = format(parseISO(endTimeUtc), 'h:mm a')

  // Determine fill status
  const isFull = assignedCount >= capacity
  const isPartial = assignedCount > 0 && assignedCount < capacity

  const fillStatusColor = isFull
    ? 'text-green-700 bg-green-50'
    : isPartial
    ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Client and Role */}
                <h3 className="text-lg font-semibold text-gray-900 truncate">{clientName}</h3>
          <p className="text-sm text-gray-600 mt-1">{roleNeeded}</p>

          {/* Time */}
          <p className="text-sm text-gray-500 mt-2">
            {startTime} - {endTime}
          </p>

          {/* Workers */}
          <div className="mt-3">
            {workers.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-700">Assigned:</p>
                <p className="text-sm text-gray-600 mt-1">
                  {workers.map((w) => `${w.first_name} ${w.last_name}`).join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No workers assigned</p>
            )}
          </div>
        </div>

        {/* Fill Status Badge */}
        <div className="ml-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fillStatusColor}`}
          >
            {assignedCount}/{capacity}
          </span>
        </div>
      </div>
    </div>
  )
}
