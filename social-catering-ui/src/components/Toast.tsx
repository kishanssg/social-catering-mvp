import { useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type = 'success', onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  };
  
  const icons = {
    success: <Check className="h-5 w-5 text-green-600" />,
    error: <X className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${styles[type]} min-w-[300px] max-w-[500px]`}>
        {icons[type]}
        <p className="flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
