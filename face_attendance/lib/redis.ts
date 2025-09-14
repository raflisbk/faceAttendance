import Redis from 'ioredis';
import { CACHE_CONSTANTS } from './constants';

declare global {
  var __redis: Redis | undefined;
}

/**
 * Redis Client Configuration
 * Singleton pattern for Redis client with connection pooling
 */
class RedisClient {
  private static instance: Redis | null = null;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 300,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4,
      });

      // Handle connection events
      RedisClient.instance.on('connect', () => {
        console.log('Redis client connected');
      });

      RedisClient.instance.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      RedisClient.instance.on('close', () => {
        console.log('Redis connection closed');
      });

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await RedisClient.instance?.quit();
      });

      process.on('SIGINT', async () => {
        await RedisClient.instance?.quit();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await RedisClient.instance?.quit();
        process.exit(0);
      });
    }

    return RedisClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
    }
  }
}

// Use singleton pattern in development
const redis = globalThis.__redis ?? RedisClient.getInstance();

if (process.env.NODE_ENV === 'development') {
  globalThis.__redis = redis;
}

/**
 * Cache Management Utilities
 */
export const cacheManager = {
  /**
   * Set cache with TTL
   */
  async set(
    key: string, 
    value: any, 
    ttl: number = CACHE_CONSTANTS.DEFAULT_TTL
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Get cache value
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete cache entry
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  },

  /**
   * Delete multiple cache entries by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  },

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await redis.incr(key);
      if (ttl && value === 1) {
        await redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Set cache with atomic operation
   */
  async setNX(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await redis.set(key, serializedValue, 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Cache setNX error for key ${key}:`, error);
      return false;
    }
  }
};

/**
 * Session Management
 */
export const sessionCache = {
  /**
   * Store user session
   */
  async setSession(sessionId: string, userId: string, data: any): Promise<void> {
    const key = `session:${sessionId}`;
    await cacheManager.set(key, { userId, ...data }, CACHE_CONSTANTS.SESSION_TTL);
  },

  /**
   * Get user session
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return await cacheManager.get(key);
  },

  /**
   * Delete user session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await cacheManager.del(key);
  },

  /**
   * Delete all sessions for user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const pattern = `session:*`;
    const keys = await redis.keys(pattern);
    
    for (const key of keys) {
      const session = await cacheManager.get(key);
      if (session?.userId === userId) {
        await cacheManager.del(key);
      }
    }
  }
};

/**
 * Face Recognition Cache
 */
export const faceCache = {
  /**
   * Store face descriptor
   */
  async storeFaceDescriptor(userId: string, descriptor: Float32Array): Promise<void> {
    const key = `face:descriptor:${userId}`;
    const descriptorArray = Array.from(descriptor);
    await cacheManager.set(key, descriptorArray, CACHE_CONSTANTS.FACE_DESCRIPTOR_TTL);
  },

  /**
   * Get face descriptor
   */
  async getFaceDescriptor(userId: string): Promise<Float32Array | null> {
    const key = `face:descriptor:${userId}`;
    const descriptorArray = await cacheManager.get<number[]>(key);
    return descriptorArray ? new Float32Array(descriptorArray) : null;
  },

  /**
   * Delete face descriptor
   */
  async deleteFaceDescriptor(userId: string): Promise<void> {
    const key = `face:descriptor:${userId}`;
    await cacheManager.del(key);
  },

  /**
   * Store face recognition result
   */
  async storeFaceRecognitionResult(
    userId: string, 
    result: { confidence: number; timestamp: number }
  ): Promise<void> {
    const key = `face:recognition:${userId}`;
    await cacheManager.set(key, result, 300); // 5 minutes
  }
};

/**
 * Rate Limiting
 */
export const rateLimiter = {
  /**
   * Check and increment rate limit
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetTime
      };
    } catch (error) {
      console.