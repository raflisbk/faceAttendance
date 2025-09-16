import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date and time utilities
 */
export class DateUtils {
  /**
   * Get current date in ISO format
   */
  static getCurrentDate(): Date {
    return new Date()
  }

  /**
   * Format date for display
   */
  static formatForDisplay(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj)
  }

  /**
   * Get date range for period
   */
  static getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
    const now = new Date()
    const start = new Date()
    const end = new Date()

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        const day = now.getDay()
        start.setDate(now.getDate() - day)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(start.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
    }

    return { start, end }
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end
  }

  /**
   * Get relative time string
   */
  static getRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`

    return FormatUtils.formatDate(date)
  }

  /**
   * Format date to readable string
   */
  static formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(dateObj)
  }
}

/**
 * Format utilities for various data types
 */
export class FormatUtils {
  /**
   * Format date to readable string
   */
  static formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(dateObj)
  }

  /**
   * Format date and time
   */
  static formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj)
  }

  /**
   * Format time only
   */
  static formatTime(date: Date | string, use24Hour: boolean = false): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour
    }).format(dateObj)
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  /**
   * Format file size to human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Format number with commas
   */
  static formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num)
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${(value * 100).toFixed(decimals)}%`
  }

  /**
   * Format user role for display
   */
  static formatRole(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'LECTURER':
        return 'Lecturer'
      case 'STUDENT':
        return 'Student'
      default:
        return StringUtils.capitalize(role)
    }
  }

  /**
   * Format confidence score
   */
  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Check if email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check if password meets requirements
   */
  static isValidPassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if phone number is valid
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  }

  /**
   * Check if URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Capitalize first letter
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  /**
   * Convert to title case
   */
  static toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    )
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength - 3) + '...'
  }

  /**
   * Convert string to slug
   */
  static toSlug(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-')
  }

  /**
   * Extract initials from name
   */
  static getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
}

/**
 * Array utilities
 */
export class ArrayUtils {
  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)]
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Shuffle array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    return shuffled
  }

  /**
   * Group array by key
   */
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }
}

/**
 * Object utilities
 */
export class ObjectUtils {
  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0
  }

  /**
   * Pick specific keys from object
   */
  static pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key]
      }
    })
    return result
  }

  /**
   * Omit specific keys from object
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj }
    keys.forEach(key => {
      delete result[key]
    })
    return result
  }
}

/**
 * Local storage utilities with error handling
 */
export class StorageUtils {
  /**
   * Get item from localStorage with fallback
   */
  static getItem<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  }

  /**
   * Set item to localStorage
   */
  static setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  /**
   * Clear all localStorage
   */
  static clear(): boolean {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  }
}

/**
 * Face recognition utilities
 */
export class FaceUtils {
  /**
   * Convert canvas to blob
   */
  static canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      }, 'image/jpeg', quality)
    })
  }

  /**
   * Resize image while maintaining aspect ratio
   */
  static resizeImage(
    file: File, 
    maxWidth: number, 
    maxHeight: number, 
    quality: number = 0.9
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to resize image'))
          }
        }, 'image/jpeg', quality)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Calculate face detection confidence score
   */
  static calculateConfidence(detections: any[]): number {
    if (detections.length === 0) return 0
    const avgConfidence = detections.reduce((sum, detection) => 
      sum + (detection.detection?.score || 0), 0) / detections.length
    return Math.round(avgConfidence * 100)
  }

  /**
   * Check if face is centered in frame
   */
  static isFaceCentered(
    detection: any, 
    frameWidth: number, 
    frameHeight: number, 
    tolerance: number = 0.3
  ): boolean {
    if (!detection?.detection?.box) return false
    
    const { x, y, width, height } = detection.detection.box
    const faceCenterX = x + width / 2
    const faceCenterY = y + height / 2
    const frameCenterX = frameWidth / 2
    const frameCenterY = frameHeight / 2
    
    const distanceX = Math.abs(faceCenterX - frameCenterX) / frameWidth
    const distanceY = Math.abs(faceCenterY - frameCenterY) / frameHeight
    
    return distanceX <= tolerance && distanceY <= tolerance
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Create user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    if (typeof error === 'string') return error
    
    if (error?.message) {
      const message = error.message.toLowerCase()
      
      if (message.includes('network')) return 'Network connection error. Please check your internet connection.'
      if (message.includes('timeout')) return 'Request timed out. Please try again.'
      if (message.includes('unauthorized')) return 'You are not authorized to perform this action.'
      if (message.includes('forbidden')) return 'Access denied. Please check your permissions.'
      if (message.includes('not found')) return 'The requested resource was not found.'
      if (message.includes('validation')) return 'Please check your input and try again.'
      
      return error.message
    }
    
    return 'An unexpected error occurred. Please try again.'
  }

  /**
   * Log error with context
   */
  static logError(error: any, context?: string): void {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
    }
    
    console.error('Application Error:', errorInfo)
  }
}

/**
 * Environment utilities
 */
export class EnvUtils {
  /**
   * Check if running in development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  /**
   * Check if running in browser
   */
  static isBrowser(): boolean {
    return typeof window !== 'undefined'
  }

  /**
   * Get environment variable with fallback
   */
  static getEnvVar(key: string, fallback: string = ''): string {
    return process.env[key] || fallback
  }
}