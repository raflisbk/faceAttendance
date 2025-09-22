/**
 * Database Query Optimizer
 * Advanced caching and query optimization utilities
 */

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface CacheOptions {
  ttl?: number // seconds
  tags?: string[]
  invalidateOn?: string[]
}

interface QueryOptions {
  useCache?: boolean
  cacheKey?: string
  cacheTTL?: number
  select?: any
  include?: any
}

/**
 * Advanced query cache wrapper
 */
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer
  private queryCache = new Map<string, { data: any; expires: number; tags: string[] }>()

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer()
    }
    return DatabaseOptimizer.instance
  }

  /**
   * Optimized user query with intelligent caching
   */
  async getUser(id: string, options: QueryOptions = {}): Promise<any> {
    const cacheKey = `user:${id}:${JSON.stringify(options.select || {})}`

    if (options.useCache !== false) {
      const cached = await this.getFromCache(cacheKey)
      if (cached) return cached
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: options.select || {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        registrationStep: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (user && options.useCache !== false) {
      await this.setCache(cacheKey, user, options.cacheTTL || 300, ['user', `user:${id}`])
    }

    return user
  }

  /**
   * Optimized class query with enrollment data
   */
  async getClassWithEnrollments(classId: string, userId?: string): Promise<any> {
    const cacheKey = `class:${classId}:enrollments:${userId || 'all'}`

    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        schedule: true,
        capacity: true,
        isActive: true,
        lecturer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            building: true,
            floor: true,
            room: true,
            wifiSsid: true,
            gpsCoordinates: true
          }
        },
        enrollments: userId ? {
          where: { userId },
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            user: {
              select: {
                id: true,
                name: true,
                studentId: true
              }
            }
          }
        } : {
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            user: {
              select: {
                id: true,
                name: true,
                studentId: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true,
            attendances: {
              where: {
                timestamp: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        }
      }
    })

    if (classData) {
      await this.setCache(cacheKey, classData, 180, ['class', `class:${classId}`, 'enrollments'])
    }

    return classData
  }

  /**
   * Optimized attendance history with pagination
   */
  async getAttendanceHistory(
    userId: string,
    options: {
      page?: number
      limit?: number
      classId?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<any> {
    const { page = 1, limit = 20, classId, startDate, endDate } = options
    const offset = (page - 1) * limit

    const cacheKey = `attendance:history:${userId}:${JSON.stringify(options)}`

    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    const whereClause: any = { userId }

    if (classId) whereClause.classId = classId
    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = startDate
      if (endDate) whereClause.timestamp.lte = endDate
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        select: {
          id: true,
          timestamp: true,
          status: true,
          method: true,
          confidenceScore: true,
          checkInTime: true,
          checkOutTime: true,
          class: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.attendance.count({ where: whereClause })
    ])

    const result = {
      attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }

    await this.setCache(cacheKey, result, 120, ['attendance', `attendance:user:${userId}`])
    return result
  }

  /**
   * Bulk user operations with optimized queries
   */
  async getUsersWithStats(filters: any = {}): Promise<any> {
    const cacheKey = `users:stats:${JSON.stringify(filters)}`

    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    const users = await prisma.user.findMany({
      where: filters,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        registrationStep: true,
        createdAt: true,
        _count: {
          select: {
            attendances: true,
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    await this.setCache(cacheKey, users, 300, ['users', 'stats'])
    return users
  }

  /**
   * Dashboard statistics with heavy caching
   */
  async getDashboardStats(userRole: string, userId?: string): Promise<any> {
    const cacheKey = `dashboard:stats:${userRole}:${userId || 'all'}`

    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    let stats: any = {}

    switch (userRole) {
      case 'ADMIN':
        stats = await this.getAdminStats()
        break
      case 'LECTURER':
        stats = await this.getLecturerStats(userId!)
        break
      case 'STUDENT':
        stats = await this.getStudentStats(userId!)
        break
    }

    await this.setCache(cacheKey, stats, 180, ['dashboard', `dashboard:${userRole}`])
    return stats
  }

  private async getAdminStats(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalClasses,
      totalAttendances,
      todayAttendances
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.class.count({ where: { isActive: true } }),
      prisma.attendance.count(),
      prisma.attendance.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      totalClasses,
      totalAttendances,
      todayAttendances
    }
  }

  private async getLecturerStats(lecturerId: string): Promise<any> {
    const [
      myClasses,
      totalStudents,
      todayAttendances,
      thisWeekAttendances
    ] = await Promise.all([
      prisma.class.count({ where: { lecturerId, isActive: true } }),
      prisma.enrollment.count({
        where: {
          class: { lecturerId },
          status: 'ACTIVE'
        }
      }),
      prisma.attendance.count({
        where: {
          class: { lecturerId },
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.attendance.count({
        where: {
          class: { lecturerId },
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    return {
      myClasses,
      totalStudents,
      todayAttendances,
      thisWeekAttendances
    }
  }

  private async getStudentStats(studentId: string): Promise<any> {
    const [
      enrolledClasses,
      totalAttendances,
      thisMonthAttendances,
      attendanceRate
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { userId: studentId, status: 'ACTIVE' }
      }),
      prisma.attendance.count({ where: { userId: studentId } }),
      prisma.attendance.count({
        where: {
          userId: studentId,
          timestamp: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.calculateAttendanceRate(studentId)
    ])

    return {
      enrolledClasses,
      totalAttendances,
      thisMonthAttendances,
      attendanceRate
    }
  }

  private async calculateAttendanceRate(studentId: string): Promise<number> {
    const enrolledClasses = await prisma.enrollment.count({
      where: { userId: studentId, status: 'ACTIVE' }
    })

    if (enrolledClasses === 0) return 0

    const attendedClasses = await prisma.attendance.count({
      where: { userId: studentId }
    })

    return Math.round((attendedClasses / enrolledClasses) * 100)
  }

  /**
   * Cache utilities
   */
  private async getFromCache(key: string): Promise<any> {
    try {
      // Try Redis first
      const redisData = await redis.get(key)
      if (redisData) {
        return JSON.parse(redisData)
      }

      // Fallback to memory cache
      const memoryData = this.queryCache.get(key)
      if (memoryData && memoryData.expires > Date.now()) {
        return memoryData.data
      }

      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  private async setCache(key: string, data: any, ttl: number, tags: string[] = []): Promise<void> {
    try {
      const expires = Date.now() + (ttl * 1000)

      // Set in Redis
      await redis.setex(key, ttl, JSON.stringify(data))

      // Set in memory cache as backup
      this.queryCache.set(key, { data, expires, tags })

      // Clean up expired memory cache entries
      this.cleanupMemoryCache()
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now()
    for (const [key, value] of this.queryCache) {
      if (value.expires <= now) {
        this.queryCache.delete(key)
      }
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    try {
      // Redis cache invalidation would need a more sophisticated implementation
      // For now, we'll clear memory cache by tags
      for (const [key, value] of this.queryCache) {
        if (value.tags.some(tag => tags.includes(tag))) {
          this.queryCache.delete(key)
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  /**
   * Prefetch common data
   */
  async prefetchCommonData(userId: string, userRole: string): Promise<void> {
    try {
      // Prefetch user data
      this.getUser(userId, { useCache: true })

      // Prefetch dashboard stats
      this.getDashboardStats(userRole, userId)

      // Role-specific prefetching
      switch (userRole) {
        case 'STUDENT':
          // Prefetch today's classes and recent attendance
          this.getAttendanceHistory(userId, { limit: 10 })
          break
        case 'LECTURER':
          // Prefetch lecturer's classes
          break
        case 'ADMIN':
          // Prefetch user stats
          this.getUsersWithStats({ status: 'PENDING' })
          break
      }
    } catch (error) {
      console.error('Prefetch error:', error)
    }
  }
}

// Export singleton instance
export const dbOptimizer = DatabaseOptimizer.getInstance()

// Export utility functions
export async function getCachedUser(id: string, select?: any) {
  return dbOptimizer.getUser(id, { select, useCache: true })
}

export async function getCachedClass(classId: string, userId?: string) {
  return dbOptimizer.getClassWithEnrollments(classId, userId)
}

export async function getCachedAttendanceHistory(userId: string, options?: any) {
  return dbOptimizer.getAttendanceHistory(userId, options)
}

export async function getCachedDashboardStats(userRole: string, userId?: string) {
  return dbOptimizer.getDashboardStats(userRole, userId)
}

export async function prefetchUserData(userId: string, userRole: string) {
  return dbOptimizer.prefetchCommonData(userId, userRole)
}