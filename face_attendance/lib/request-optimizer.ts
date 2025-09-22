/**
 * Request/Response Optimization
 * Advanced HTTP request optimization, compression, and caching
 */

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  timeout?: number
  retries?: number
  cache?: boolean
  compress?: boolean
  deduplicate?: boolean
}

interface CachedResponse {
  data: any
  timestamp: number
  expires: number
  etag?: string
}

/**
 * Advanced HTTP client with optimization features
 */
export class OptimizedRequest {
  private static cache = new Map<string, CachedResponse>()
  private static pendingRequests = new Map<string, Promise<any>>()
  private static requestQueue: Array<() => Promise<any>> = []
  private static isProcessingQueue = false

  /**
   * Optimized fetch with caching, deduplication, and compression
   */
  static async fetch(url: string, options: RequestOptions = {}): Promise<any> {
    const {
      timeout = 10000,
      retries = 3,
      cache = true,
      compress = true,
      deduplicate = true,
      ...fetchOptions
    } = options

    // Create cache key
    const cacheKey = this.createCacheKey(url, fetchOptions)

    // Check cache first
    if (cache && fetchOptions.method !== 'POST') {
      const cached = this.getFromCache(cacheKey)
      if (cached) return cached
    }

    // Deduplicate identical requests
    if (deduplicate && this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }

    // Create optimized request
    const requestPromise = this.executeRequest(url, {
      ...fetchOptions,
      headers: {
        'Accept-Encoding': compress ? 'gzip, deflate, br' : 'identity',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      }
    }, timeout, retries)

    // Store pending request for deduplication
    if (deduplicate) {
      this.pendingRequests.set(cacheKey, requestPromise)
    }

    try {
      const result = await requestPromise

      // Cache successful GET requests
      if (cache && fetchOptions.method !== 'POST' && result) {
        this.setCache(cacheKey, result, 300) // 5 minutes default
      }

      return result
    } finally {
      // Clean up pending request
      if (deduplicate) {
        this.pendingRequests.delete(cacheKey)
      }
    }
  }

  /**
   * Execute request with timeout and retries
   */
  private static async executeRequest(
    url: string,
    options: RequestInit,
    timeout: number,
    retries: number
  ): Promise<any> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          return await response.json()
        }

        return await response.text()
      } catch (error) {
        lastError = error as Error

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout')
          }
          if (error.message.includes('HTTP 4')) {
            throw error // Don't retry client errors
          }
        }

        // Exponential backoff for retries
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError || new Error('Request failed after retries')
  }

  /**
   * Batch multiple requests for efficiency
   */
  static async batchRequests<T>(
    requests: Array<{ url: string; options?: RequestOptions }>,
    maxConcurrent = 5
  ): Promise<T[]> {
    const results: T[] = []
    const executing: Promise<any>[] = []

    for (const { url, options } of requests) {
      const promise = this.fetch(url, options).then(
        (result) => result,
        (error) => ({ error: error.message })
      )

      results.push(promise as any)

      if (requests.length >= maxConcurrent) {
        executing.push(promise)

        if (executing.length >= maxConcurrent) {
          await Promise.race(executing)
          const index = executing.findIndex(p => p === promise)
          if (index > -1) executing.splice(index, 1)
        }
      }
    }

    return Promise.all(results)
  }

  /**
   * Request queuing for rate limiting
   */
  static async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, 3) // Process 3 at a time
      await Promise.all(batch.map(fn => fn().catch(console.error)))
      await this.delay(100) // Small delay between batches
    }

    this.isProcessingQueue = false
  }

  /**
   * Cache management
   */
  private static createCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  private static getFromCache(key: string): any {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private static setCache(key: string, data: any, ttlSeconds: number): void {
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires
    })

    // Clean up expired cache entries
    this.cleanupCache()
  }

  private static cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache) {
      if (now > cached.expires) {
        this.cache.delete(key)
      }
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Request compression utilities
   */
  static compressRequestBody(data: any): string {
    try {
      // Simple JSON compression by removing unnecessary whitespace
      return JSON.stringify(data, null, 0)
    } catch {
      return JSON.stringify(data)
    }
  }

  /**
   * Progressive data loading
   */
  static async loadProgressively<T>(
    url: string,
    options: RequestOptions & {
      onProgress?: (data: Partial<T>) => void
      chunkSize?: number
    } = {}
  ): Promise<T> {
    const { onProgress, chunkSize = 1000, ...requestOptions } = options

    try {
      const response = await fetch(url, requestOptions)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let result: Partial<T> = {}

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Try to parse complete JSON objects from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line)
              result = { ...result, ...chunk }
              onProgress?.(result)
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      return result as T
    } catch (error) {
      throw new Error(`Progressive loading failed: ${error}`)
    }
  }

  /**
   * API-specific optimized methods
   */
  static async apiRequest(endpoint: string, options: RequestOptions = {}) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
    const url = `${baseUrl}/api${endpoint}`

    return this.fetch(url, {
      cache: true,
      compress: true,
      deduplicate: true,
      timeout: 8000,
      ...options,
      headers: {
        'Authorization': this.getAuthToken(),
        ...options.headers
      }
    })
  }

  private static getAuthToken(): string {
    if (typeof window === 'undefined') return ''

    // Get token from localStorage or cookie
    const token = localStorage.getItem('auth-token') ||
                  document.cookie.split('; ')
                    .find(row => row.startsWith('auth-token='))
                    ?.split('=')[1]

    return token ? `Bearer ${token}` : ''
  }

  /**
   * Prefetch critical API endpoints
   */
  static prefetchCriticalEndpoints(userRole: string): void {
    const endpoints: Record<string, string[]> = {
      ADMIN: [
        '/admin/dashboard/stats',
        '/admin/system/health',
        '/users?status=PENDING'
      ],
      LECTURER: [
        '/lecturer/classes',
        '/lecturer/dashboard/stats'
      ],
      STUDENT: [
        '/student/dashboard/stats',
        '/student/today-classes',
        '/attendance/history?limit=5'
      ]
    }

    const userEndpoints = endpoints[userRole] || []

    userEndpoints.forEach(endpoint => {
      this.apiRequest(endpoint, { cache: true }).catch(() => {
        // Ignore prefetch errors
      })
    })
  }
}

// Utility functions
export const optimizedFetch = OptimizedRequest.fetch.bind(OptimizedRequest)
export const apiRequest = OptimizedRequest.apiRequest.bind(OptimizedRequest)
export const batchRequests = OptimizedRequest.batchRequests.bind(OptimizedRequest)
export const queueRequest = OptimizedRequest.queueRequest.bind(OptimizedRequest)
export const prefetchEndpoints = OptimizedRequest.prefetchCriticalEndpoints.bind(OptimizedRequest)

// React hook for optimized API calls
export function useOptimizedAPI() {
  return {
    get: (url: string, options?: RequestOptions) =>
      OptimizedRequest.apiRequest(url, { method: 'GET', ...options }),

    post: (url: string, data?: any, options?: RequestOptions) =>
      OptimizedRequest.apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
        cache: false,
        ...options
      }),

    put: (url: string, data?: any, options?: RequestOptions) =>
      OptimizedRequest.apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        cache: false,
        ...options
      }),

    delete: (url: string, options?: RequestOptions) =>
      OptimizedRequest.apiRequest(url, { method: 'DELETE', cache: false, ...options }),

    batch: (requests: Array<{ url: string; options?: RequestOptions }>) =>
      OptimizedRequest.batchRequests(requests)
  }
}