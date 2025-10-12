interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner = ({ size = 'md', message }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-600`}
      ></div>
      {message && (
        <p className="text-gray-500 mt-4">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
