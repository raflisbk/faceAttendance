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
   * Format duration in minutes to readable string
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  /**
   * Format file size to readable string
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)
    
    return `${size.toFixed(1)} ${sizes[i]}`
  }

  /**
   * Format confidence percentage
   */
  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`
  }

  /**
   * Format user role for display
   */
  static formatRole(role: string): string {
    return role.toLowerCase().replace('_', ' ')
  }

  /**
   * Format attendance count
   */
  static formatAttendanceCount(present: number, total: number): string {
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0
    return `${present}/${total} (${percentage}%)`
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number (Indonesian format)
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  /**
   * Validate student ID format
   */
  static isValidStudentId(studentId: string): boolean {
    // Assuming format: 2 digits year + 2 digits faculty + 4 digits number
    const studentIdRegex = /^[0-9]{8}$/
    return studentIdRegex.test(studentId)
  }

  /**
   * Validate image file type
   */
  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  /**
   * Validate face descriptor array
   */
  static isValidFaceDescriptor(descriptor: any): boolean {
    return descriptor instanceof Float32Array && descriptor.length === 128
  }

  /**
   * Validate WiFi SSID format
   */
  static isValidSSID(ssid: string): boolean {
    return ssid.length >= 1 && ssid.length <= 32
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Generate random string for tokens
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Generate OTP code
   */
  static generateOTP(length: number = 6): string {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += digits.charAt(Math.floor(Math.random() * digits.length))
    }
    return otp
  }

  /**
   * Mask email for privacy
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@')
    if (username.length <= 2) return email
    
    const masked = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1)
    return `${masked}@${domain}`
  }

  /**
   * Mask phone number for privacy
   */
  static maskPhone(phone: string): string {
    if (phone.length <= 4) return phone
    return phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2)
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  }
}

/**
 * Date/Time utilities
 */
export class DateUtils {
  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    
    return dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear()
  }

  /**
   * Check if date is within time range
   */
  static isWithinTimeRange(
    date: Date | string,
    startTime: string,
    endTime: string
  ): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const currentTime = dateObj.getHours() * 60 + dateObj.getMinutes()
    
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const start = startHour * 60 + startMin
    const end = endHour * 60 + endMin
    
    return currentTime >= start && currentTime <= end
  }

  /**
   * Get time difference in minutes
   */
  static getTimeDifferenceMinutes(date1: Date, date2: Date): number {
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60)
  }

  /**
   * Add minutes to date
   */
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000)
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date: Date = new Date()): Date {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    return startOfDay
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date: Date = new Date()): Date {
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return endOfDay
  }

  /**
   * Get day name from date
   */
  static getDayName(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  static getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    
    return FormatUtils.formatDate(dateObj)
  }
}

/**
 * Storage utilities for browser storage
 */
export class StorageUtils {
  /**
   * Set item in localStorage with expiration
   */
  static setWithExpiry(key: string, value: any, ttlMs: number): void {
    const now = new Date()
    const item = {
      value: value,
      expiry: now.getTime() + ttlMs,
    }
    localStorage.setItem(key, JSON.stringify(item))
  }

  /**
   * Get item from localStorage with expiration check
   */
  static getWithExpiry(key: string): any | null {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null

    try {
      const item = JSON.parse(itemStr)
      const now = new Date()

      if (now.getTime() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.value
    } catch {
      localStorage.removeItem(key)
      return null
    }
  }

  /**
   * Clear expired items from localStorage
   */
  static clearExpired(): void {
    const now = new Date().getTime()
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue

      try {
        const itemStr = localStorage.getItem(key)
        if (!itemStr) continue

        const item = JSON.parse(itemStr)
        if (item.expiry && now > item.expiry) {
          localStorage.removeItem(key)
        }
      } catch {
        // Invalid JSON, remove it
        localStorage.removeItem(key)
      }
    }
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
   * Group array by key
   */
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key])
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  /**
   * Sort array by date field
   */
  static sortByDate<T>(array: T[], dateKey: keyof T, ascending: boolean = true): T[] {
    return [...array].sort((a, b) => {
      const dateA = new Date(a[dateKey] as any).getTime()
      const dateB = new Date(b[dateKey] as any).getTime()
      return ascending ? dateA - dateB : dateB - dateA
    })
  }

  /**
   * Paginate array
   */
  static paginate<T>(array: T[], page: number, limit: number): T[] {
    const startIndex = (page - 1) * limit
    return array.slice(startIndex, startIndex + limit)
  }
}

/**
 * URL utilities
 */
export class UrlUtils {
  /**
   * Build query string from object
   */
  static buildQueryString(params: Record<string, any>): string {
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    
    return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : ''
  }

  /**
   * Parse query string to object
   */
  static parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {}
    const urlParams = new URLSearchParams(queryString)
    
    for (const [key, value] of urlParams) {
      params[key] = value
    }
    
    return params
  }

  /**
   * Get base URL for API calls
   */
  static getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Extract error message from various error types
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
    
    return 'An unknown error occurred'
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(message: string, code?: string): { error: string; code?: string } {
    return {
      error: message,
      ...(code && { code })
    }
  }

  /**
   * Log error with context
   */
  static logError(error: unknown, context?: string): void {
    const message = this.getErrorMessage(error)
    const logMessage = context ? `[${context}] ${message}` : message
    
    console.error(logMessage, error)
    
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error)
    }
  }
}

/**
 * Device/Browser utilities
 */
export class DeviceUtils {
  /**
   * Check if device is mobile
   */
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  }

  /**
   * Check if device supports camera
   */
  static supportsCamera(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  /**
   * Check if device supports geolocation
   */
  static supportsGeolocation(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Get device info string
   */
  static getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'Server'
    
    const { userAgent } = navigator
    const mobile = this.isMobile() ? 'Mobile' : 'Desktop'
    
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    return `${mobile} ${browser}`
  }
}

/**
 * Face recognition utilities
 */
export class FaceUtils {
  /**
   * Calculate face descriptor distance
   */
  static calculateDistance(desc1: Float32Array, desc2: Float32Array): number {
    if (desc1.length !== desc2.length) {
      throw new Error('Descriptors must have the same length')
    }
    
    let sum = 0
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i]
      sum += diff * diff
    }
    
    return Math.sqrt(sum)
  }

  /**
   * Find best match from array of descriptors
   */
  static findBestMatch(
    targetDescriptor: Float32Array,
    descriptors: Float32Array[],
    threshold: number = 0.6
  ): { index: number; distance: number } | null {
    let bestMatch = null
    let minDistance = Infinity

    descriptors.forEach((descriptor, index) => {
      const distance = this.calculateDistance(targetDescriptor, descriptor)
      if (distance < minDistance && distance < threshold) {
        minDistance = distance
        bestMatch = { index, distance }
      }
    })

    return bestMatch
  }

  /**
   * Validate face quality metrics
   */
  static validateFaceQuality(quality: {
    score: number
    brightness: number
    sharpness: number
    faceSize: number
  }): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    if (quality.score < 0.7) issues.push('Face quality too low')
    if (quality.brightness < 0.3) issues.push('Image too dark')
    if (quality.brightness > 0.9) issues.push('Image too bright')
    if (quality.sharpness < 0.5) issues.push('Image too blurry')
    if (quality.faceSize < 80) issues.push('Face too small')
    if (quality.faceSize > 500) issues.push('Face too large')

    return {
      valid: issues.length === 0,
      issues
    }
  }
}