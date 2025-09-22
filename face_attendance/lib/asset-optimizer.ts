/**
 * Asset Optimization Utilities
 * Preloading, compression, and caching strategies
 */

interface AssetPreloadOptions {
  as: 'script' | 'style' | 'font' | 'image' | 'video' | 'audio' | 'document'
  crossorigin?: 'anonymous' | 'use-credentials'
  type?: string
  media?: string
}

/**
 * Preload critical assets
 */
export class AssetOptimizer {
  private static preloadedAssets = new Set<string>()
  private static fontCache = new Map<string, FontFace>()

  /**
   * Preload critical resources
   */
  static preloadAsset(href: string, options: AssetPreloadOptions): void {
    if (this.preloadedAssets.has(href)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = options.as

    if (options.crossorigin) {
      link.crossOrigin = options.crossorigin
    }

    if (options.type) {
      link.type = options.type
    }

    if (options.media) {
      link.media = options.media
    }

    document.head.appendChild(link)
    this.preloadedAssets.add(href)
  }

  /**
   * Preload critical fonts
   */
  static preloadFonts(): void {
    const criticalFonts = [
      '/fonts/PressStart2P-Regular.woff2',
      '/fonts/JetBrainsMono-Regular.woff2',
      '/fonts/SpaceMono-Regular.woff2'
    ]

    criticalFonts.forEach(font => {
      this.preloadAsset(font, {
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous'
      })
    })
  }

  /**
   * Preload critical images
   */
  static preloadCriticalImages(): void {
    const criticalImages = [
      '/images/logo.png',
      '/images/face-scan-bg.jpg',
      '/images/default-avatar.png'
    ]

    criticalImages.forEach(image => {
      this.preloadAsset(image, { as: 'image' })
    })
  }

  /**
   * Lazy load non-critical assets
   */
  static lazyLoadAssets(): void {
    // Preload face-api models when user navigates to face-related pages
    if (typeof window !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement
              const preloadType = element.dataset.preload

              switch (preloadType) {
                case 'face-models':
                  this.preloadFaceModels()
                  break
                case 'charts':
                  this.preloadChartAssets()
                  break
                case 'camera':
                  this.preloadCameraAssets()
                  break
              }

              observer.unobserve(element)
            }
          })
        },
        { rootMargin: '50px' }
      )

      // Observe elements that need asset preloading
      document.querySelectorAll('[data-preload]').forEach(el => {
        observer.observe(el)
      })
    }
  }

  /**
   * Preload face recognition models
   */
  private static async preloadFaceModels(): Promise<void> {
    try {
      const modelUrls = [
        '/models/face_landmark_68_model-weights_manifest.json',
        '/models/face_recognition_model-weights_manifest.json',
        '/models/tiny_face_detector_model-weights_manifest.json'
      ]

      modelUrls.forEach(url => {
        this.preloadAsset(url, { as: 'document' })
      })
    } catch (error) {
      console.warn('Failed to preload face models:', error)
    }
  }

  /**
   * Preload chart and visualization assets
   */
  private static preloadChartAssets(): void {
    // Preload any chart-related assets
    this.preloadAsset('/scripts/chart-bundle.js', { as: 'script' })
  }

  /**
   * Preload camera-related assets
   */
  private static preloadCameraAssets(): void {
    // Preload camera icons and overlay images
    const cameraAssets = [
      '/images/camera-overlay.png',
      '/images/face-outline.svg'
    ]

    cameraAssets.forEach(asset => {
      this.preloadAsset(asset, { as: 'image' })
    })
  }

  /**
   * Optimize font loading
   */
  static optimizeFontLoading(): void {
    if (typeof window === 'undefined') return

    const fonts = [
      {
        family: 'Press Start 2P',
        source: 'url(/fonts/PressStart2P-Regular.woff2) format("woff2")',
        weight: '400',
        style: 'normal'
      },
      {
        family: 'JetBrains Mono',
        source: 'url(/fonts/JetBrainsMono-Regular.woff2) format("woff2")',
        weight: '400',
        style: 'normal'
      },
      {
        family: 'Space Mono',
        source: 'url(/fonts/SpaceMono-Regular.woff2) format("woff2")',
        weight: '400',
        style: 'normal'
      }
    ]

    fonts.forEach(({ family, source, weight, style }) => {
      if (!this.fontCache.has(family)) {
        const fontFace = new FontFace(family, source, {
          weight,
          style,
          display: 'swap'
        })

        fontFace.load().then(() => {
          document.fonts.add(fontFace)
          this.fontCache.set(family, fontFace)
        }).catch(error => {
          console.warn(`Failed to load font ${family}:`, error)
        })
      }
    })
  }

  /**
   * Compress and optimize images client-side
   */
  static async compressImage(
    file: File,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
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

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
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
   * Progressive image loading
   */
  static createProgressiveImage(
    lowQualitySrc: string,
    highQualitySrc: string,
    container: HTMLElement
  ): void {
    const lowQualityImg = new Image()
    const highQualityImg = new Image()

    // Load low quality first
    lowQualityImg.onload = () => {
      container.style.backgroundImage = `url(${lowQualitySrc})`
      container.style.filter = 'blur(2px)'

      // Start loading high quality
      highQualityImg.src = highQualitySrc
    }

    // Replace with high quality when loaded
    highQualityImg.onload = () => {
      container.style.backgroundImage = `url(${highQualitySrc})`
      container.style.filter = 'none'
    }

    lowQualityImg.src = lowQualitySrc
  }

  /**
   * Service Worker cache management
   */
  static setupAssetCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered:', registration)
      }).catch(error => {
        console.log('SW registration failed:', error)
      })
    }
  }

  /**
   * Prefetch next page assets
   */
  static prefetchPageAssets(pathname: string): void {
    const prefetchMap: Record<string, string[]> = {
      '/login': ['/api/auth/login'],
      '/register': ['/api/registration/step-1', '/models/face_detection_model.json'],
      '/dashboard': ['/api/dashboard/stats'],
      '/attendance': ['/models/face_recognition_model.json', '/api/attendance/history'],
      '/admin': ['/api/admin/users', '/api/admin/system/health']
    }

    const assetsToPrefetch = prefetchMap[pathname] || []

    assetsToPrefetch.forEach(asset => {
      if (asset.startsWith('/api/')) {
        // Prefetch API data
        fetch(asset, { method: 'HEAD' }).catch(() => {
          // Ignore errors for prefetch
        })
      } else {
        // Prefetch static assets
        this.preloadAsset(asset, { as: 'document' })
      }
    })
  }

  /**
   * Initialize all optimizations
   */
  static initialize(): void {
    if (typeof window === 'undefined') return

    // Critical assets
    this.preloadFonts()
    this.optimizeFontLoading()

    // Setup service worker
    this.setupAssetCaching()

    // Setup lazy loading
    requestIdleCallback(() => {
      this.lazyLoadAssets()
    })

    // Prefetch based on current page
    const currentPath = window.location.pathname
    this.prefetchPageAssets(currentPath)
  }
}

// Utility functions
export function preloadCriticalAssets(): void {
  AssetOptimizer.initialize()
}

export function compressImageFile(file: File, quality = 0.8): Promise<File> {
  return AssetOptimizer.compressImage(file, 1920, 1080, quality)
}

export function prefetchRoute(path: string): void {
  AssetOptimizer.prefetchPageAssets(path)
}

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AssetOptimizer.initialize()
  })
}