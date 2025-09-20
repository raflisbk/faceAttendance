'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface PixelToastProps {
  toast: ToastData
  onRemove: (id: string) => void
}

const ToastIcon = ({ type, className }: { type: ToastType; className?: string }) => {
  const iconProps = { className: cn('w-5 h-5', className) }

  switch (type) {
    case 'success':
      return <CheckCircleIcon {...iconProps} />
    case 'error':
      return <XCircleIcon {...iconProps} />
    case 'warning':
      return <ExclamationTriangleIcon {...iconProps} />
    case 'info':
    default:
      return <InformationCircleIcon {...iconProps} />
  }
}

export function PixelToast({ toast, onRemove }: PixelToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 100)

    // Auto-remove after duration
    const duration = toast.duration || 4000
    const removeTimer = setTimeout(() => {
      handleRemove()
    }, duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(removeTimer)
    }
  }, [toast.id, toast.duration])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300)
  }

  const getToastStyles = (type: ToastType) => {
    const baseStyles = "border-2 bg-background/95 backdrop-blur-sm"

    switch (type) {
      case 'success':
        return `${baseStyles} border-green-500 text-green-400`
      case 'error':
        return `${baseStyles} border-red-500 text-red-400`
      case 'warning':
        return `${baseStyles} border-yellow-500 text-yellow-400`
      case 'info':
      default:
        return `${baseStyles} border-blue-500 text-blue-400`
    }
  }

  const getProgressBarColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'info':
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div
      className={cn(
        'pixel-card transform transition-all duration-300 ease-out',
        'max-w-sm w-full shadow-lg relative overflow-hidden',
        getToastStyles(toast.type),
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isRemoving ? 'translate-x-full opacity-0' : ''
      )}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-border">
        <div
          className={cn(
            'h-full transition-all ease-linear',
            getProgressBarColor(toast.type)
          )}
          style={{
            width: '100%',
            animation: `shrink ${toast.duration || 4000}ms linear forwards`
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4 pt-5">
        <div className="flex items-start space-x-3">
          <ToastIcon type={toast.type} />
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-pixel font-medium text-foreground">
                {toast.title}
              </p>
            )}
            <p className={cn(
              "text-pixel-small",
              toast.title ? "text-muted-foreground" : "text-foreground"
            )}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pixel corner decorations */}
      <div className="absolute top-1 left-1 w-1 h-1 bg-foreground opacity-30" />
      <div className="absolute top-1 right-1 w-1 h-1 bg-foreground opacity-30" />
      <div className="absolute bottom-1 left-1 w-1 h-1 bg-foreground opacity-30" />
      <div className="absolute bottom-1 right-1 w-1 h-1 bg-foreground opacity-30" />
    </div>
  )
}

// Toast Container Component
interface PixelToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
}

export function PixelToastContainer({ toasts, onRemove }: PixelToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <PixelToast toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}

// Custom hook for pixel toasts
export function usePixelToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (message: string, title?: string) => {
    addToast({ type: 'success', message, title })
  }

  const error = (message: string, title?: string) => {
    addToast({ type: 'error', message, title })
  }

  const warning = (message: string, title?: string) => {
    addToast({ type: 'warning', message, title })
  }

  const info = (message: string, title?: string) => {
    addToast({ type: 'info', message, title })
  }

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

// CSS for shrink animation (add to your global CSS)
const shrinkKeyframes = `
@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
`

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = shrinkKeyframes
  document.head.appendChild(style)
}