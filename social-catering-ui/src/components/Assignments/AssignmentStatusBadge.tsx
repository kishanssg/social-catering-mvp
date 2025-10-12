interface AssignmentStatusBadgeProps {
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
}

const AssignmentStatusBadge = ({ status, size = 'md' }: AssignmentStatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'no_show':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'assigned':
        return 'Assigned';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`${sizeClasses[size]} font-medium rounded-full ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
};

export default AssignmentStatusBadge;
