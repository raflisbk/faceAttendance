/**
 * Optimized Image Component
 * Advanced image loading with performance optimizations
 */

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Generate placeholder blur data URL if not provided
  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px'
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  const handleLoad = () => {
    setImageLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setImageError(true)
    onError?.()
  }

  const imageProps = {
    src: isInView ? src : '',
    alt,
    quality,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      'transition-opacity duration-300',
      imageLoaded ? 'opacity-100' : 'opacity-0',
      className
    ),
    ...(placeholder === 'blur' && {
      placeholder: 'blur' as const,
      blurDataURL: blurDataURL || defaultBlurDataURL
    }),
    ...(fill ? { fill: true } : { width, height }),
    ...(sizes && { sizes }),
    ...(priority && { priority: true }),
    style: fill ? { objectFit } : undefined
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : '',
        !imageLoaded && 'animate-pulse bg-muted'
      )}
      style={!fill ? { width, height } : undefined}
    >
      {isInView && !imageError && (
        <Image {...imageProps} />
      )}

      {imageError && (
        <div className="w-full h-full flex items-center justify-center bg-muted pixel-border">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded mb-2 mx-auto"></div>
            <span className="text-pixel-small">Failed to load</span>
          </div>
        </div>
      )}

      {!imageLoaded && !imageError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}

// Avatar-specific optimized component
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallback
}: {
  src?: string
  alt: string
  size?: number
  className?: string
  fallback?: React.ReactNode
}) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className={cn(
          'pixel-border bg-muted flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || (
          <span className="text-pixel-small font-bold">
            {alt.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('pixel-border', className)}
      quality={90}
      priority={size > 64} // Prioritize larger avatars
      onError={() => setError(true)}
    />
  )
}

// Document/File preview optimized component
export function OptimizedDocumentPreview({
  src,
  alt,
  className,
  maxWidth = 400,
  maxHeight = 300
}: {
  src: string
  alt: string
  className?: string
  maxWidth?: number
  maxHeight?: number
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={maxWidth}
      height={maxHeight}
      className={cn('pixel-border object-contain', className)}
      quality={75}
      sizes={`(max-width: 768px) 100vw, ${maxWidth}px`}
      placeholder="blur"
    />
  )
}

// Face capture preview optimized component
export function OptimizedFacePreview({
  src,
  alt,
  size = 150,
  className
}: {
  src: string
  alt: string
  size?: number
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('pixel-border rounded-lg object-cover', className)}
      quality={90}
      priority={true} // Face images are often critical
    />
  )
}

// Background image component
export function OptimizedBackground({
  src,
  alt,
  children,
  className,
  overlay = false
}: {
  src: string
  alt: string
  children?: React.ReactNode
  className?: string
  overlay?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        objectFit="cover"
        quality={60}
        priority={false}
        className="z-0"
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/40 z-10"></div>
      )}
      {children && (
        <div className="relative z-20">
          {children}
        </div>
      )}
    </div>
  )
}