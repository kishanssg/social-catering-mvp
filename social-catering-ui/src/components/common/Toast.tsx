import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  action?: ToastAction;
}

export function Toast({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 4000,
  action
}: ToastProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!shouldRender) return null;

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle : XCircle;

  return createPortal(
    <div
      className={`fixed top-6 right-6 z-[10001] transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-4 px-5 py-4 rounded-xl shadow-xl max-w-sm border ${
          isSuccess
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
        style={{ 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          animation: isVisible ? 'toastSlideIn 0.3s ease-out' : 'toastSlideOut 0.2s ease-in'
        }}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
          isSuccess ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            isSuccess ? 'text-green-600' : 'text-red-600'
          }`} />
        </div>
        <p className="text-sm font-semibold font-manrope flex-1 leading-relaxed">{message}</p>
        <div className="flex items-center gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                action.variant === 'primary'
                  ? isSuccess 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                  : isSuccess
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {action.label}
            </button>
          )}
          <button
            onClick={onClose}
            className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-all duration-200 ${
              isSuccess ? 'text-green-600 hover:text-green-700 hover:bg-green-100' : 'text-red-600 hover:text-red-700 hover:bg-red-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
