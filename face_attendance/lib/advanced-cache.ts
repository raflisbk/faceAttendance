/**
 * Advanced Caching System
 * Multi-layer caching with intelligent invalidation
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
  hits: number
  tags: string[]
  size: number
}

interface CacheConfig {
  maxSize: number // bytes
  maxAge: number // seconds
  maxEntries: number
  cleanupInterval: number // seconds
}

/**
 * Advanced multi-layer cache system
 */
export class AdvancedCache {
  private static instances = new Map<string, AdvancedCache>()
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig
  private currentSize = 0
  private cleanupTimer?: NodeJS.Timeout

  constructor(name: string, config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 3600, // 1 hour
      maxEntries: 1000,
      cleanupInterval: 300, // 5 minutes
      ...config
    }

    this.startCleanupTimer()
    AdvancedCache.instances.set(name, this)
  }

  static getInstance(name: string, config?: Partial<CacheConfig>): AdvancedCache {
    let instance = this.instances.get(name)
    if (!instance) {
      instance = new AdvancedCache(name, config)
    }
    return instance
  }

  /**
   * Set cache entry with intelligent sizing and tagging
   */
  set<T>(key: string, data: T, options: {
    ttl?: number
    tags?: string[]
    priority?: 'low' | 'normal' | 'high'
  } = {}): void {
    const { ttl = this.config.maxAge, tags = [], priority = 'normal' } = options

    // Calculate entry size
    const size = this.calculateSize(data)

    // Check if we need to make space
    this.makeSpace(size)

    // Create cache entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (ttl * 1000),
      hits: 0,
      tags,
      size
    }

    // Apply priority-based TTL adjustment
    if (priority === 'high') {
      entry.expires = Date.now() + (ttl * 2000) // Double TTL for high priority
    } else if (priority === 'low') {
      entry.expires = Date.now() + (ttl * 500) // Half TTL for low priority
    }

    this.cache.set(key, entry)
    this.currentSize += size
  }

  /**
   * Get cache entry with hit tracking
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check expiration
    if (Date.now() > entry.expires) {
      this.delete(key)
      return null
    }

    // Update hit count and access time
    entry.hits++
    entry.timestamp = Date.now()

    return entry.data
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: {
      ttl?: number
      tags?: string[]
      priority?: 'low' | 'normal' | 'high'
    } = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return cached

    const data = await factory()
    this.set(key, data, options)
    return data
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * Invalidate by tags
   */
  invalidateByTags(tags: string[]): number {
    let deletedCount = 0

    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.delete(key)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: number
    hitRate: number
    averageSize: number
    oldestEntry: number
    memoryUsage: string
  } {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const totalAccesses = entries.length

    return {
      size: this.currentSize,
      entries: this.cache.size,
      hitRate: totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0,
      averageSize: this.cache.size > 0 ? this.currentSize / this.cache.size : 0,
      oldestEntry: Math.min(...entries.map(e => e.timestamp)),
      memoryUsage: this.formatBytes(this.currentSize)
    }
  }

  /**
   * Smart cleanup based on LRU and hit frequency
   */
  private cleanup(): void {
    const now = Date.now()
    let deletedCount = 0

    // Remove expired entries first
    for (const [key, entry] of this.cache) {
      if (now > entry.expires) {
        this.delete(key)
        deletedCount++
      }
    }

    // If still over limits, use smart eviction
    if (this.cache.size > this.config.maxEntries || this.currentSize > this.config.maxSize) {
      this.smartEviction()
    }

    console.log(`Cache cleanup: removed ${deletedCount} expired entries`)
  }

  /**
   * Smart eviction based on LRU + frequency
   */
  private smartEviction(): void {
    const entries = Array.from(this.cache.entries())

    // Sort by score (lower is worse)
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateEvictionScore(a)
      const scoreB = this.calculateEvictionScore(b)
      return scoreA - scoreB
    })

    // Remove worst entries until under limits
    let removed = 0
    for (const [key] of entries) {
      if (this.cache.size <= this.config.maxEntries &&
          this.currentSize <= this.config.maxSize) {
        break
      }

      this.delete(key)
      removed++
    }

    console.log(`Smart eviction: removed ${removed} entries`)
  }

  /**
   * Calculate eviction score (lower = more likely to be evicted)
   */
  private calculateEvictionScore(entry: CacheEntry<any>): number {
    const now = Date.now()
    const age = now - entry.timestamp
    const remainingTtl = entry.expires - now
    const hitFrequency = entry.hits / Math.max(1, age / 1000) // hits per second

    // Combine factors: higher hits + longer remaining TTL = higher score
    return (hitFrequency * 1000) + (remainingTtl / 1000)
  }

  /**
   * Make space for new entry
   */
  private makeSpace(requiredSize: number): void {
    // Quick check if we have space
    if (this.currentSize + requiredSize <= this.config.maxSize &&
        this.cache.size < this.config.maxEntries) {
      return
    }

    // Remove expired entries first
    this.cleanup()

    // If still need space, use smart eviction
    if (this.currentSize + requiredSize > this.config.maxSize ||
        this.cache.size >= this.config.maxEntries) {
      this.smartEviction()
    }
  }

  /**
   * Calculate size of data for caching
   */
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return JSON.stringify(data).length * 2 // Rough estimate
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval * 1000
    )
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}

/**
 * Browser Storage Cache (localStorage/sessionStorage)
 */
export class BrowserStorageCache {
  private storage: Storage
  private prefix: string

  constructor(type: 'local' | 'session' = 'local', prefix = 'app_cache_') {
    this.storage = type === 'local' ? localStorage : sessionStorage
    this.prefix = prefix
  }

  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        expires: ttl ? Date.now() + (ttl * 1000) : null
      }

      this.storage.setItem(this.prefix + key, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to set browser cache:', error)
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.prefix + key)
      if (!item) return null

      const entry = JSON.parse(item)

      // Check expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.delete(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('Failed to get browser cache:', error)
      return null
    }
  }

  delete(key: string): void {
    this.storage.removeItem(this.prefix + key)
  }

  clear(): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => this.storage.removeItem(key))
  }
}

/**
 * IndexedDB Cache for large data
 */
export class IndexedDBCache {
  private dbName: string
  private version: number
  private db: IDBDatabase | null = null

  constructor(dbName = 'app_cache', version = 1) {
    this.dbName = dbName
    this.version = version
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' })
          store.createIndex('expires', 'expires', { unique: false })
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true })
        }
      }
    })
  }

  async set<T>(key: string, data: T, ttl?: number, tags: string[] = []): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')

      const entry = {
        key,
        data,
        timestamp: Date.now(),
        expires: ttl ? Date.now() + (ttl * 1000) : null,
        tags
      }

      const request = store.put(entry)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const entry = request.result

        if (!entry) {
          resolve(null)
          return
        }

        // Check expiration
        if (entry.expires && Date.now() > entry.expires) {
          this.delete(key)
          resolve(null)
          return
        }

        resolve(entry.data)
      }
    })
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

// Pre-configured cache instances
export const memoryCache = AdvancedCache.getInstance('memory', {
  maxSize: 20 * 1024 * 1024, // 20MB
  maxAge: 1800, // 30 minutes
  maxEntries: 500
})

export const apiCache = AdvancedCache.getInstance('api', {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxAge: 300, // 5 minutes
  maxEntries: 200
})

export const userCache = AdvancedCache.getInstance('user', {
  maxSize: 5 * 1024 * 1024, // 5MB
  maxAge: 3600, // 1 hour
  maxEntries: 100
})

export const browserCache = new BrowserStorageCache('local')
export const sessionCache = new BrowserStorageCache('session')
export const largeDataCache = new IndexedDBCache()

// Utility functions
export function invalidateUserCache(userId: string): void {
  userCache.invalidateByTags([`user:${userId}`])
  apiCache.invalidateByTags([`user:${userId}`])
}

export function invalidateClassCache(classId: string): void {
  memoryCache.invalidateByTags([`class:${classId}`])
  apiCache.invalidateByTags([`class:${classId}`])
}

export function getCacheStats(): Record<string, any> {
  return {
    memory: memoryCache.getStats(),
    api: apiCache.getStats(),
    user: userCache.getStats()
  }
}