import AssignmentStatusBadge from './AssignmentStatusBadge';

// Demo component to show different size variants
export function AssignmentStatusBadgeDemo() {
  const statuses: Array<'assigned' | 'completed' | 'no_show' | 'cancelled'> = [
    'assigned',
    'completed', 
    'no_show',
    'cancelled'
  ];

  const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Assignment Status Badge Demo</h3>
      
      {sizes.map(size => (
        <div key={size} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 capitalize">Size: {size}</h4>
          <div className="flex space-x-2">
            {statuses.map(status => (
              <AssignmentStatusBadge 
                key={`${size}-${status}`}
                status={status} 
                size={size} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
