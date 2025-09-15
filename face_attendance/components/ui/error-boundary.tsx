import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

// Default Error Fallback Component
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError
}) => {
  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-red-800 dark:text-red-200">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left mb-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                  <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                    {error.name}: {error.message}
                  </p>
                  <pre className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={resetError}
              variant="chalk"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={goHome}
              variant="chalkOutline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Component Error Fallback for smaller errors
export const ComponentErrorFallback: React.FC<{ 
  error: Error
  resetError: () => void
  className?: string 
}> = ({ error, resetError, className }) => (
  <div className={`p-4 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      <h3 className="font-medium text-red-800 dark:text-red-200">
        Component Error
      </h3>
    </div>
    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
      This component failed to load properly.
    </p>
    <Button 
      onClick={resetError}
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
    >
      <RefreshCw className="w-3 h-3 mr-2" />
      Retry
    </Button>
  </div>
)