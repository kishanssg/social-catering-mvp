interface ShiftStatusBadgeProps {
  status: 'draft' | 'published' | 'assigned' | 'completed' | 'cancelled'
}

const ShiftStatusBadge = ({ status }: ShiftStatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      case 'published':
        return 'bg-blue-100 text-blue-700'
      case 'assigned':
        return 'bg-green-100 text-green-700'
      case 'completed':
        return 'bg-purple-100 text-purple-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyles()}`}>
      {getStatusText()}
    </span>
  )
}

export default ShiftStatusBadge


