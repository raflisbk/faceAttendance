/**
 * Performance Monitoring System
 * Real-time performance tracking and analytics
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: 'load' | 'render' | 'interaction' | 'network' | 'memory'
  metadata?: Record<string, any>
}

interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

/**
 * Performance monitoring and analytics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private webVitals: WebVitalsMetric[] = []
  private observers: Map<string, PerformanceObserver> = new Map()
  private isEnabled = true

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring()
    }
  }

  /**
   * Initialize all performance monitoring
   */
  private initializeMonitoring(): void {
    this.setupNavigationTiming()
    this.setupResourceTiming()
    this.setupPaintTiming()
    this.setupLayoutShiftTracking()
    this.setupMemoryMonitoring()
    this.setupWebVitals()
    this.setupCustomMetrics()
  }

  /**
   * Track navigation timing
   */
  private setupNavigationTiming(): void {
    if ('PerformanceNavigationTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const nav = entry as PerformanceNavigationTiming

          // Track key navigation metrics
          this.recordMetric('domContentLoaded', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart, 'load', {
            type: nav.type,
            redirectCount: nav.redirectCount
          })

          this.recordMetric('domComplete', nav.domComplete - nav.navigationStart, 'load')
          this.recordMetric('loadComplete', nav.loadEventEnd - nav.navigationStart, 'load')
          this.recordMetric('timeToInteractive', nav.domInteractive - nav.navigationStart, 'load')
        })
      })

      observer.observe({ entryTypes: ['navigation'] })
      this.observers.set('navigation', observer)
    }
  }

  /**
   * Track resource loading performance
   */
  private setupResourceTiming(): void {
    if ('PerformanceResourceTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming

          // Track slow resources
          if (resource.duration > 1000) { // Slower than 1 second
            this.recordMetric('slowResource', resource.duration, 'network', {
              name: resource.name,
              type: this.getResourceType(resource.name),
              size: resource.transferSize
            })
          }

          // Track resource categories
          const resourceType = this.getResourceType(resource.name)
          this.recordMetric(`${resourceType}LoadTime`, resource.duration, 'network', {
            url: resource.name,
            size: resource.transferSize
          })
        })
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', observer)
    }
  }

  /**
   * Track paint timing
   */
  private setupPaintTiming(): void {
    if ('PerformancePaintTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.recordMetric('firstPaint', entry.startTime, 'render')
          } else if (entry.name === 'first-contentful-paint') {
            this.recordMetric('firstContentfulPaint', entry.startTime, 'render')
          }
        })
      })

      observer.observe({ entryTypes: ['paint'] })
      this.observers.set('paint', observer)
    }
  }

  /**
   * Track layout shifts (CLS)
   */
  private setupLayoutShiftTracking(): void {
    if ('LayoutShift' in window) {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as any
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value
          }
        }

        this.recordMetric('cumulativeLayoutShift', clsValue, 'render')
      })

      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('layout-shift', observer)
    }
  }

  /**
   * Monitor memory usage
   */
  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.recordMetric('usedJSHeapSize', memory.usedJSHeapSize / 1024 / 1024, 'memory') // MB
        this.recordMetric('totalJSHeapSize', memory.totalJSHeapSize / 1024 / 1024, 'memory') // MB
        this.recordMetric('jsHeapSizeLimit', memory.jsHeapSizeLimit / 1024 / 1024, 'memory') // MB
      }, 30000) // Every 30 seconds
    }
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitals(): void {
    // This would typically use the web-vitals library
    // For now, we'll implement basic versions

    // Largest Contentful Paint (LCP)
    if ('LargestContentfulPaint' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any

        this.recordWebVital('LCP', lastEntry.startTime)
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', observer)
    }

    // First Input Delay (FID)
    if ('PerformanceEventTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const eventEntry = entry as any
          if (eventEntry.name === 'click' || eventEntry.name === 'keydown') {
            const fid = eventEntry.processingStart - eventEntry.startTime
            this.recordWebVital('FID', fid)
          }
        })
      })

      observer.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', observer)
    }
  }

  /**
   * Setup custom performance metrics
   */
  private setupCustomMetrics(): void {
    // Track React component render times
    this.trackReactPerformance()

    // Track API request times
    this.trackAPIPerformance()

    // Track user interactions
    this.trackUserInteractions()
  }

  /**
   * Track React component performance
   */
  private trackReactPerformance(): void {
    if (process.env.NODE_ENV === 'development') {
      // Hook into React DevTools Profiler
      if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
        const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__

        const originalOnCommitFiberRoot = devtools.onCommitFiberRoot
        devtools.onCommitFiberRoot = (id: number, root: any, priorityLevel: any) => {
          const startTime = performance.now()

          if (originalOnCommitFiberRoot) {
            originalOnCommitFiberRoot(id, root, priorityLevel)
          }

          const endTime = performance.now()
          this.recordMetric('reactCommit', endTime - startTime, 'render', {
            fiberRootId: id,
            priorityLevel
          })
        }
      }
    }
  }

  /**
   * Track API request performance
   */
  private trackAPIPerformance(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url

      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()

        this.recordMetric('apiRequest', endTime - startTime, 'network', {
          url,
          status: response.status,
          method: args[1]?.method || 'GET',
          success: response.ok
        })

        return response
      } catch (error) {
        const endTime = performance.now()

        this.recordMetric('apiRequest', endTime - startTime, 'network', {
          url,
          method: args[1]?.method || 'GET',
          error: true,
          success: false
        })

        throw error
      }
    }
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions(): void {
    const interactionEvents = ['click', 'scroll', 'keydown', 'touchstart']

    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.recordMetric('userInteraction', performance.now(), 'interaction', {
          type: eventType,
          target: (event.target as Element)?.tagName || 'unknown'
        })
      }, { passive: true })
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics.shift()
    }

    // Log significant performance issues
    this.checkPerformanceThresholds(metric)
  }

  /**
   * Record Web Vitals metric
   */
  private recordWebVital(name: WebVitalsMetric['name'], value: number): void {
    const rating = this.getRating(name, value)

    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    }

    this.webVitals.push(metric)

    // Report to analytics
    this.reportToAnalytics(metric)
  }

  /**
   * Get performance rating based on Web Vitals thresholds
   */
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 }
    }

    const threshold = thresholds[name]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Check if metrics exceed performance thresholds
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds: Record<string, number> = {
      apiRequest: 3000, // 3 seconds
      firstContentfulPaint: 2000, // 2 seconds
      domContentLoaded: 2000, // 2 seconds
      slowResource: 2000, // 2 seconds
      reactCommit: 16 // 16ms (60fps)
    }

    const threshold = thresholds[metric.name]
    if (threshold && metric.value > threshold) {
      console.warn(`Performance warning: ${metric.name} took ${metric.value.toFixed(2)}ms`, metric)

      // Could send alert to monitoring service
      this.sendPerformanceAlert(metric)
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: Record<string, { avg: number; min: number; max: number; count: number }>
    webVitals: WebVitalsMetric[]
    issues: PerformanceMetric[]
  } {
    const summary: Record<string, { values: number[]; count: number }> = {}

    // Group metrics by name
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { values: [], count: 0 }
      }
      summary[metric.name].values.push(metric.value)
      summary[metric.name].count++
    })

    // Calculate statistics
    const metrics: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    Object.entries(summary).forEach(([name, data]) => {
      metrics[name] = {
        avg: data.values.reduce((a, b) => a + b, 0) / data.values.length,
        min: Math.min(...data.values),
        max: Math.max(...data.values),
        count: data.count
      }
    })

    // Find performance issues
    const issues = this.metrics.filter(metric => {
      const thresholds: Record<string, number> = {
        apiRequest: 3000,
        firstContentfulPaint: 2000,
        domContentLoaded: 2000,
        slowResource: 2000
      }
      return thresholds[metric.name] && metric.value > thresholds[metric.name]
    })

    return {
      metrics,
      webVitals: this.webVitals.slice(-10), // Last 10 Web Vitals
      issues: issues.slice(-20) // Last 20 issues
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'style'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font'
    if (url.includes('/api/')) return 'api'
    return 'other'
  }

  /**
   * Report metrics to analytics service
   */
  private reportToAnalytics(metric: WebVitalsMetric): void {
    // This would typically send to your analytics service
    console.log('Web Vital:', metric)

    // Example: send to Google Analytics
    if ('gtag' in window) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        custom_map: { metric_rating: metric.rating }
      })
    }
  }

  /**
   * Send performance alert
   */
  private sendPerformanceAlert(metric: PerformanceMetric): void {
    // This would typically send to monitoring service like Sentry
    console.error('Performance Alert:', {
      metric: metric.name,
      value: metric.value,
      threshold: 'exceeded',
      metadata: metric.metadata
    })
  }

  /**
   * Export performance data
   */
  exportData(): string {
    return JSON.stringify({
      summary: this.getPerformanceSummary(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }, null, 2)
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled

    if (!enabled) {
      // Disconnect all observers
      this.observers.forEach(observer => observer.disconnect())
      this.observers.clear()
    } else if (this.observers.size === 0) {
      // Reinitialize monitoring
      this.initializeMonitoring()
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
    this.webVitals = []
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      performanceMonitor.recordMetric(
        `component.${componentName}`,
        endTime - startTime,
        'render'
      )
    }
  }, [componentName])

  return {
    recordMetric: (name: string, value: number, category: PerformanceMetric['category']) => {
      performanceMonitor.recordMetric(`${componentName}.${name}`, value, category)
    },

    measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const startTime = performance.now()
      try {
        const result = await fn()
        const endTime = performance.now()
        performanceMonitor.recordMetric(`${componentName}.${name}`, endTime - startTime, 'interaction')
        return result
      } catch (error) {
        const endTime = performance.now()
        performanceMonitor.recordMetric(`${componentName}.${name}.error`, endTime - startTime, 'interaction')
        throw error
      }
    }
  }
}

import React from 'react'

// Export for use in other modules
export type { PerformanceMetric, WebVitalsMetric }