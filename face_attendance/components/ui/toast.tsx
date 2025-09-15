import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-200',
    messageColor: 'text-green-700 dark:text-green-300'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-200',
    messageColor: 'text-red-700 dark:text-red-300'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-800 dark:text-yellow-200',
    messageColor: 'text-yellow-700 dark:text-yellow-300'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-200',
    messageColor: 'text-blue-700 dark:text-blue-300'
  }
}

// Individual Toast Component
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove
}) => {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  React.useEffect(() => {
    if (!toast.persistent && toast.duration !== 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration || 5000)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, toast.persistent, onRemove])

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-right-full",
        config.bgColor,
        config.borderColor
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className={cn("text-sm font-semibold mb-1", config.titleColor)}>
            {toast.title}
          </h4>
        )}
        <p className={cn("text-sm", config.messageColor)}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className={cn(
          "flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
          config.iconColor
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toast Container Component
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove
}) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <div className="space-y-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    }

    setToasts(prev => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAll
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// Helper hooks for different toast types
export const useSuccessToast = () => {
  const { addToast } = useToast()
  
  return useCallback((message: string, title?: string, options?: Partial<Toast>) => {
    addToast({
      type: 'success',
      message,
      title,
      ...options
    })
  }, [addToast])
}

export const useErrorToast = () => {
  const { addToast } = useToast()
  
  return useCallback((message: string, title?: string, options?: Partial<Toast>) => {
    addToast({
      type: 'error',
      message,
      title,
      persistent: true, // Errors should be persistent by default
      ...options
    })
  }, [addToast])
}

export const useWarningToast = () => {
  const { addToast } = useToast()
  
  return useCallback((message: string, title?: string, options?: Partial<Toast>) => {
    addToast({
      type: 'warning',
      message,
      title,
      duration: 7000, // Warnings should stay longer
      ...options
    })
  }, [addToast])
}

export const useInfoToast = () => {
  const { addToast } = useToast()
  
  return useCallback((message: string, title?: string, options?: Partial<Toast>) => {
    addToast({
      type: 'info',
      message,
      title,
      ...options
    })
  }, [addToast])
}

// All-in-one toast hook
export const useToastHelpers = () => {
  const { addToast, removeToast, clearAll } = useToast()
  
  const success = useCallback((message: string, title?: string) => {
    addToast({ type: 'success', message, title })
  }, [addToast])
  
  const error = useCallback((message: string, title?: string) => {
    addToast({ type: 'error', message, title, persistent: true })
  }, [addToast])
  
  const warning = useCallback((message: string, title?: string) => {
    addToast({ type: 'warning', message, title, duration: 7000 })
  }, [addToast])
  
  const info = useCallback((message: string, title?: string) => {
    addToast({ type: 'info', message, title })
  }, [addToast])

  return {
    success,
    error,
    warning,
    info,
    remove: removeToast,
    clearAll
  }
}