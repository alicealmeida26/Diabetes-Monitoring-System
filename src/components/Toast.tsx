// src/components/Toast.tsx
'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <XCircle className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />
  };

  const colors = {
    success: {
      bg: 'bg-green-500',
      text: 'text-white',
      icon: 'text-white',
      progress: 'bg-green-700'
    },
    error: {
      bg: 'bg-red-500',
      text: 'text-white',
      icon: 'text-white',
      progress: 'bg-red-700'
    },
    warning: {
      bg: 'bg-yellow-500',
      text: 'text-white',
      icon: 'text-white',
      progress: 'bg-yellow-700'
    },
    info: {
      bg: 'bg-blue-500',
      text: 'text-white',
      icon: 'text-white',
      progress: 'bg-blue-700'
    }
  };

  const style = colors[type];

  return (
    <div className="fixed bottom-6 right-6 z-[99999] animate-slideInBottom">
      <div className={`${style.bg} rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md relative overflow-hidden`}>
        <div className="flex items-start gap-3">
          <div className={style.icon}>
            {icons[type]}
          </div>
          
          <div className="flex-1">
            <p className={`${style.text} font-medium text-sm leading-relaxed`}>
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`${style.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className={`h-full ${style.progress} animate-shrink`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slideInBottom {
          animation: slideInBottom 0.3s ease-out;
        }

        .animate-shrink {
          animation: shrink linear;
        }
      `}</style>
    </div>
  );
}