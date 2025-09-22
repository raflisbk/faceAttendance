/**
 * Lazy Loading Components
 * Optimized component loading with suspense boundaries
 */

import dynamic from 'next/dynamic'
import { Suspense, ComponentType } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Pixel-themed loading component
const PixelLoader = () => (
  <div className="flex items-center justify-center min-h-[200px] pixel-bg">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 pixel-card flex items-center justify-center mx-auto">
        <LoadingSpinner className="w-8 h-8 text-foreground" />
      </div>
      <p className="text-pixel animate-pixel-blink">Loading...</p>
    </div>
  </div>
)

const PixelCardLoader = () => (
  <div className="pixel-card animate-pulse">
    <div className="h-32 bg-muted rounded"></div>
  </div>
)

const PixelFormLoader = () => (
  <div className="space-y-6">
    <div className="pixel-card animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-10 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-10 bg-muted rounded"></div>
        <div className="h-12 bg-muted rounded w-32"></div>
      </div>
    </div>
  </div>
)

// Higher-order component for lazy loading with custom loader
function withLazyLoading<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  customLoader?: () => React.ReactElement
) {
  const LazyComponent = dynamic(loader, {
    loading: customLoader || PixelLoader,
    ssr: false
  })

  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={customLoader ? customLoader() : <PixelLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Face Recognition Components (Heavy)
export const LazyFaceCapture = withLazyLoading(
  () => import('@/components/face/FaceCapture'),
  () => (
    <div className="flex items-center justify-center h-64 pixel-card">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 pixel-card flex items-center justify-center mx-auto">
          <LoadingSpinner className="w-6 h-6" />
        </div>
        <p className="text-pixel-small">Initializing camera...</p>
      </div>
    </div>
  )
)

export const LazyFaceVerification = withLazyLoading(
  () => import('@/components/face/FaceVerification'),
  () => (
    <div className="flex items-center justify-center h-48 pixel-card">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 pixel-card flex items-center justify-center mx-auto">
          <LoadingSpinner className="w-5 h-5" />
        </div>
        <p className="text-pixel-small">Preparing verification...</p>
      </div>
    </div>
  )
)

// Document Processing Components (Heavy)
export const LazyDocumentScanner = withLazyLoading(
  () => import('@/components/documents/DocumentScanner'),
  () => (
    <div className="pixel-card space-y-4">
      <div className="h-64 bg-muted rounded animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-8 bg-muted rounded"></div>
      </div>
    </div>
  )
)

export const LazyOCRProcessor = withLazyLoading(
  () => import('@/components/documents/OCRProcessor'),
  () => (
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded w-1/4"></div>
      <div className="pixel-card">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
)

// Chart and Analytics Components (Heavy)
export const LazyAttendanceChart = withLazyLoading(
  () => import('@/components/charts/AttendanceChart'),
  () => (
    <div className="pixel-card">
      <div className="h-64 bg-muted rounded animate-pulse"></div>
    </div>
  )
)

export const LazyDashboardStats = withLazyLoading(
  () => import('@/components/dashboard/DashboardStats'),
  () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <PixelCardLoader key={i} />
      ))}
    </div>
  )
)

// Form Components (Medium)
export const LazyRegistrationStep1 = withLazyLoading(
  () => import('@/app/register/step-1'),
  PixelFormLoader
)

export const LazyRegistrationStep2 = withLazyLoading(
  () => import('@/app/register/step-2'),
  PixelFormLoader
)

export const LazyRegistrationStep3 = withLazyLoading(
  () => import('@/app/register/step-3'),
  PixelFormLoader
)

export const LazyRegistrationStep4 = withLazyLoading(
  () => import('@/app/register/step-4'),
  PixelFormLoader
)

// Admin Components (Medium)
export const LazyUserManagement = withLazyLoading(
  () => import('@/components/admin/UserManagement'),
  () => (
    <div className="space-y-4">
      <div className="h-12 bg-muted rounded w-1/3"></div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  )
)

export const LazySystemHealth = withLazyLoading(
  () => import('@/components/admin/SystemHealth'),
  () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <PixelCardLoader key={i} />
      ))}
    </div>
  )
)

// QR Code Component (Light but can be lazy)
export const LazyQRCodeGenerator = withLazyLoading(
  () => import('@/components/qr/QRCodeGenerator'),
  () => (
    <div className="pixel-card flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <div className="w-32 h-32 bg-muted rounded animate-pulse"></div>
        <p className="text-pixel-small">Generating QR Code...</p>
      </div>
    </div>
  )
)

// File Upload Components
export const LazyFileUpload = withLazyLoading(
  () => import('@/components/upload/FileUpload'),
  () => (
    <div className="pixel-card">
      <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-muted rounded mx-auto animate-pulse"></div>
          <p className="text-pixel-small">Initializing upload...</p>
        </div>
      </div>
    </div>
  )
)

// Report Components
export const LazyReportGenerator = withLazyLoading(
  () => import('@/components/reports/ReportGenerator'),
  () => (
    <div className="space-y-4">
      <div className="h-8 bg-muted rounded w-1/3"></div>
      <div className="pixel-card">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
)

// Calendar Components (if you have them)
export const LazyScheduleCalendar = withLazyLoading(
  () => import('@/components/schedule/ScheduleCalendar').catch(() =>
    import('@/components/ui/loading-spinner').then(mod => ({ default: mod.LoadingSpinner }))
  ),
  () => (
    <div className="pixel-card">
      <div className="h-96 bg-muted rounded animate-pulse"></div>
    </div>
  )
)

// Data Table Component
export const LazyDataTable = withLazyLoading(
  () => import('@/components/ui/data-table'),
  () => (
    <div className="space-y-4">
      <div className="h-12 bg-muted rounded w-1/4"></div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  )
)

// Utility function for lazy loading with intersection observer
export function LazySection({
  children,
  rootMargin = '50px',
  threshold = 0.1,
  fallback = <PixelLoader />
}: {
  children: React.ReactNode
  rootMargin?: string
  threshold?: number
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}

// Export utility for creating custom lazy components
export { withLazyLoading }