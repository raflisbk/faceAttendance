// face_attendance/lib/cache-service.ts
interface CacheEntry<T = any> {
  data: T
  expiresAt: number
  createdAt: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  totalKeys: number
  memoryUsage: number
  hitRate: number
  totalHits: number
  totalMisses: number
  oldestEntry: number
  newestEntry: number
}

export class CacheService {
  private static instance: CacheService
  private cache = new Map<string, CacheEntry>()
  private maxSize: number = 1000
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes
  private hits: number = 0
  private misses: number = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startCleanupInterval()
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const timeToLive = ttl || this.defaultTTL
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldestEntries(Math.floor(this.maxSize * 0.1))
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: now + timeToLive,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Update access info
    entry.accessCount++
    entry.lastAccessed = Date.now()
    
    this.hits++
    return entry.data as T
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get or set cache entry with async loader
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await loader()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Cache for face recognition descriptors
   */
  setFaceDescriptor(userId: string, descriptors: Float32Array[], ttl: number = 30 * 60 * 1000): void {
    this.set(`face:${userId}`, descriptors, ttl)
  }

  getFaceDescriptor(userId: string): Float32Array[] | null {
    return this.get<Float32Array[]>(`face:${userId}`)
  }

  /**
   * Cache for user sessions
   */
  setUserSession(sessionId: string, userData: any, ttl: number = 60 * 60 * 1000): void {
    this.set(`session:${sessionId}`, userData, ttl)
  }

  getUserSession(sessionId: string): any | null {
    return this.get(`session:${sessionId}`)
  }

  /**
   * Cache for class schedules
   */
  setClassSchedule(classId: string, schedule: any, ttl: number = 24 * 60 * 60 * 1000): void {
    this.set(`schedule:${classId}`, schedule, ttl)
  }

  getClassSchedule(classId: string): any | null {
    return this.get(`schedule:${classId}`)
  }

  /**
   * Cache for attendance records
   */
  setAttendanceRecords(
    key: string, 
    records: any[], 
    ttl: number = 10 * 60 * 1000
  ): void {
    this.set(`attendance:${key}`, records, ttl)
  }

  getAttendanceRecords(key: string): any[] | null {
    return this.get<any[]>(`attendance:${key}`)
  }

  /**
   * Cache for WiFi networks
   */
  setWiFiNetworks(locationId: string, networks: any[], ttl: number = 5 * 60 * 1000): void {
    this.set(`wifi:${locationId}`, networks, ttl)
  }

  getWiFiNetworks(locationId: string): any[] | null {
    return this.get<any[]>(`wifi:${locationId}`)
  }

  /**
   * Cache for user notifications
   */
  setUserNotifications(userId: string, notifications: any[], ttl: number = 2 * 60 * 1000): void {
    this.set(`notifications:${userId}`, notifications, ttl)
  }

  getUserNotifications(userId: string): any[] | null {
    return this.get<any[]>(`notifications:${userId}`)
  }

  /**
   * Increment cache value (for counters)
   */
  increment(key: string, amount: number = 1, ttl?: number): number {
    const current = this.get<number>(key) || 0
    const newValue = current + amount
    this.set(key, newValue, ttl)
    return newValue
  }

  /**
   * Set with tags for group invalidation
   */
  setWithTags<T>(key: string, data: T, tags: string[], ttl?: number): void {
    this.set(key, data, ttl)
    
    // Store tag mappings
    tags.forEach(tag => {
      const tagKey = `tag:${tag}`
      const taggedKeys = this.get<string[]>(tagKey) || []
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key)
        this.set(tagKey, taggedKeys, ttl)
      }
    })
  }

  /**
   * Invalidate all entries with specific tag
   */
  invalidateByTag(tag: string): number {
    const tagKey = `tag:${tag}`
    const taggedKeys = this.get<string[]>(tagKey) || []
    
    let deletedCount = 0
    taggedKeys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++
      }
    })
    
    this.delete(tagKey)
    return deletedCount
  }

  /**
   * Get multiple cache entries
   */
  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>()
    keys.forEach(key => {
      results.set(key, this.get<T>(key))
    })
    return results
  }

  /**
   * Set multiple cache entries
   */
  setMultiple<T>(entries: Map<string, T>, ttl?: number): void {
    entries.forEach((data, key) => {
      this.set(key, data, ttl)
    })
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())

    let memoryUsage = 0
    entries.forEach(entry => {
      memoryUsage += JSON.stringify(entry).length * 2 // Rough estimate
    })

    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0

    const timestamps = entries.map(entry => entry.createdAt)
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0

    return {
      totalKeys: this.cache.size,
      memoryUsage,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.hits,
      totalMisses: this.misses,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * Get all keys matching pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.cache.keys()).filter(key => regex.test(key))
  }

  /**
   * Export cache data
   */
  export(): Record<string, any> {
    const exported: Record<string, any> = {}
    this.cache.forEach((entry, key) => {
      if (Date.now() <= entry.expiresAt) {
        exported[key] = {
          data: entry.data,
          expiresAt: entry.expiresAt,
          createdAt: entry.createdAt
        }
      }
    })
    return exported
  }

  /**
   * Import cache data
   */
  import(data: Record<string, any>): number {
    let importedCount = 0
    const now = Date.now()

    Object.entries(data).forEach(([key, entryData]) => {
      if (entryData.expiresAt > now) {
        const entry: CacheEntry = {
          data: entryData.data,
          expiresAt: entryData.expiresAt,
          createdAt: entryData.createdAt,
          accessCount: 0,
          lastAccessed: now
        }
        this.cache.set(key, entry)
        importedCount++
      }
    })

    return importedCount
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(loaders: Record<string, () => Promise<any>>): Promise<void> {
    const promises = Object.entries(loaders).map(async ([key, loader]) => {
      try {
        const data = await loader()
        this.set(key, data)
      } catch (error) {
        console.error(`Failed to warm up cache for key ${key}:`, error)
      }
    })

    await Promise.all(promises)
  }

  /**
   * Configure cache settings
   */
  configure(options: {
    maxSize?: number
    defaultTTL?: number
    cleanupInterval?: number
  }): void {
    if (options.maxSize !== undefined) {
      this.maxSize = options.maxSize
    }
    
    if (options.defaultTTL !== undefined) {
      this.defaultTTL = options.defaultTTL
    }

    if (options.cleanupInterval !== undefined) {
      this.stopCleanupInterval()
      this.startCleanupInterval(options.cleanupInterval)
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanupInterval(interval: number = 60 * 1000): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, interval)
  }

  /**
   * Stop automatic cleanup
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): number {
    const now = Date.now()
    let deletedCount = 0

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        deletedCount++
      }
    })

    return deletedCount
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count)

    entries.forEach(([key]) => {
      this.cache.delete(key)
    })
  }

  /**
   * Cleanup when instance is destroyed
   */
  destroy(): void {
    this.stopCleanupInterval()
    this.clear()
  }
}