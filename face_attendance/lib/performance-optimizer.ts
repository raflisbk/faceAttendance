/**
 * Client-Side Performance Optimizer
 * Advanced performance optimization utilities
 */

interface PerformanceConfig {
  enableVirtualization: boolean
  enableMemoization: boolean
  enableDebouncing: boolean
  enablePrefetching: boolean
  batchUpdates: boolean
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  private static config: PerformanceConfig = {
    enableVirtualization: true,
    enableMemoization: true,
    enableDebouncing: true,
    enablePrefetching: true,
    batchUpdates: true
  }

  private static updateQueue: Array<() => void> = []
  private static isProcessingQueue = false

  /**
   * Debounced function executor
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    immediate = false
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
      const later = () => {
        timeoutId = null
        if (!immediate) func(...args)
      }

      const callNow = immediate && !timeoutId

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(later, delay)

      if (callNow) func(...args)
    }
  }

  /**
   * Throttled function executor
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * Batch DOM updates
   */
  static batchUpdate(updateFn: () => void): void {
    if (!this.config.batchUpdates) {
      updateFn()
      return
    }

    this.updateQueue.push(updateFn)

    if (!this.isProcessingQueue) {
      this.isProcessingQueue = true
      requestAnimationFrame(() => {
        this.processUpdateQueue()
      })
    }
  }

  private static processUpdateQueue(): void {
    const updates = [...this.updateQueue]
    this.updateQueue.length = 0

    updates.forEach(update => {
      try {
        update()
      } catch (error) {
        console.error('Batch update error:', error)
      }
    })

    this.isProcessingQueue = false

    // Process any new updates that came in
    if (this.updateQueue.length > 0) {
      requestAnimationFrame(() => this.processUpdateQueue())
    }
  }

  /**
   * Virtual scrolling implementation
   */
  static createVirtualList<T>(
    items: T[],
    containerHeight: number,
    itemHeight: number,
    renderItem: (item: T, index: number) => React.ReactNode
  ): {
    visibleItems: Array<{ item: T; index: number }>
    scrollTop: number
    totalHeight: number
    startIndex: number
    endIndex: number
  } {
    const totalHeight = items.length * itemHeight
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(0 / itemHeight) // Would be calculated from scroll position
    const endIndex = Math.min(startIndex + visibleCount + 5, items.length - 1) // Buffer

    const visibleItems = items
      .slice(startIndex, endIndex + 1)
      .map((item, i) => ({ item, index: startIndex + i }))

    return {
      visibleItems,
      scrollTop: 0,
      totalHeight,
      startIndex,
      endIndex
    }
  }

  /**
   * Memory management utilities
   */
  static cleanupMemory(): void {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }

    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old') || name.includes('temp')) {
            caches.delete(name)
          }
        })
      })
    }

    // Clear console
    if (process.env.NODE_ENV === 'production') {
      console.clear()
    }
  }

  /**
   * Intersection Observer for lazy loading
   */
  static createIntersectionObserver(
    callback: (entry: IntersectionObserverEntry) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    }

    return new IntersectionObserver((entries) => {
      entries.forEach(callback)
    }, defaultOptions)
  }

  /**
   * Measure component performance
   */
  static measurePerformance(
    name: string,
    fn: () => void | Promise<void>
  ): Promise<number> {
    return new Promise(async (resolve) => {
      const startTime = performance.now()

      try {
        await fn()
      } catch (error) {
        console.error(`Performance measurement failed for ${name}:`, error)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
      resolve(duration)
    })
  }

  /**
   * Web Worker utilities
   */
  static createWorker(workerFunction: () => void): Worker {
    const blob = new Blob([`(${workerFunction.toString()})()`], {
      type: 'application/javascript'
    })

    return new Worker(URL.createObjectURL(blob))
  }

  /**
   * Optimize images on the client side
   */
  static async optimizeImage(
    file: File,
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.8
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate optimal dimensions
        let { width, height } = img

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        // Enable image smoothing for better quality
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(optimizedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Resource hints for better loading
   */
  static addResourceHints(): void {
    // Preconnect to critical domains
    const criticalDomains = [
      'https://res.cloudinary.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]

    criticalDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })

    // DNS prefetch for other domains
    const prefetchDomains = [
      'https://api.cloudinary.com'
    ]

    prefetchDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = domain
      document.head.appendChild(link)
    })
  }

  /**
   * Optimize React rendering
   */
  static optimizeReactRendering(): void {
    // Add React DevTools performance markers
    if (process.env.NODE_ENV === 'development') {
      // Enable React profiler in development
      if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
        const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
        if (devtools.isEnabled) {
          devtools.onCommitFiberRoot = (id: number, root: any) => {
            console.log('React commit:', id, root)
          }
        }
      }
    }
  }

  /**
   * Battery and network optimization
   */
  static adaptToConditions(): {
    isLowBattery: boolean
    isSlowConnection: boolean
    shouldReduceAnimations: boolean
  } {
    let isLowBattery = false
    let isSlowConnection = false

    // Check battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        isLowBattery = battery.level < 0.2 && !battery.charging
      })
    }

    // Check connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      isSlowConnection = connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g'
    }

    const shouldReduceAnimations = isLowBattery || isSlowConnection ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Apply optimizations based on conditions
    if (shouldReduceAnimations) {
      document.documentElement.style.setProperty('--animation-duration', '0s')
      document.documentElement.style.setProperty('--transition-duration', '0s')
    }

    return { isLowBattery, isSlowConnection, shouldReduceAnimations }
  }

  /**
   * Service Worker optimization
   */
  static optimizeServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_UPDATED') {
          // Handle cache updates
          console.log('Cache updated:', event.data.payload)
        }
      })

      // Update service worker when new version is available
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }
}

import React from 'react'

/**
 * React hooks for performance optimization
 */
export function usePerformanceOptimizer() {
  return {
    debounce: PerformanceOptimizer.debounce,
    throttle: PerformanceOptimizer.throttle,
    batchUpdate: PerformanceOptimizer.batchUpdate,
    measurePerformance: PerformanceOptimizer.measurePerformance
  }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now()

  return {
    recordMetric: (metricName: string, value?: number) => {
      const currentTime = performance.now()
      const duration = value || (currentTime - startTime)

      // Send to analytics or logging service
      console.log(`Performance: ${componentName}.${metricName} = ${duration.toFixed(2)}ms`)

      // Store in performance buffer for reporting
      if ('performance' in window && 'mark' in performance) {
        performance.mark(`${componentName}.${metricName}`)
      }
    },

    measureRender: () => {
      const renderTime = performance.now() - startTime
      console.log(`Render: ${componentName} took ${renderTime.toFixed(2)}ms`)
      return renderTime
    }
  }
}

/**
 * Virtual list hook for large datasets
 */
export function useVirtualList<T>(
  items: T[],
  containerRef: React.RefObject<HTMLElement>,
  itemHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const [containerHeight, setContainerHeight] = React.useState(600)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      setContainerHeight(container.clientHeight)
    }

    const handleScroll = PerformanceOptimizer.throttle(() => {
      setScrollTop(container.scrollTop)
    }, 16) // 60fps

    updateHeight()
    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', updateHeight)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateHeight)
    }
  }, [containerRef])

  const visibleRange = React.useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan])

  const visibleItems = React.useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  return {
    visibleItems,
    startIndex: visibleRange.startIndex,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight
  }
}

// Initialize performance optimizations
if (typeof window !== 'undefined') {
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PerformanceOptimizer.addResourceHints()
      PerformanceOptimizer.optimizeReactRendering()
      PerformanceOptimizer.optimizeServiceWorker()
      PerformanceOptimizer.adaptToConditions()
    })
  } else {
    PerformanceOptimizer.addResourceHints()
    PerformanceOptimizer.optimizeReactRendering()
    PerformanceOptimizer.optimizeServiceWorker()
    PerformanceOptimizer.adaptToConditions()
  }

  // Cleanup memory periodically
  setInterval(() => {
    PerformanceOptimizer.cleanupMemory()
  }, 5 * 60 * 1000) // Every 5 minutes
}