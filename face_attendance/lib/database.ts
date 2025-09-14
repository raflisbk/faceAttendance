import { PrismaClient } from '@prisma/client';
import { DB_CONSTANTS } from './constants';

declare global {
  var __db: PrismaClient | undefined;
}

/**
 * Database Client Configuration
 * Singleton pattern for Prisma client with connection pooling and logging
 */
class DatabaseClient {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await DatabaseClient.instance?.$disconnect();
      });

      process.on('SIGINT', async () => {
        await DatabaseClient.instance?.$disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await DatabaseClient.instance?.$disconnect();
        process.exit(0);
      });
    }

    return DatabaseClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (DatabaseClient.instance) {
      await DatabaseClient.instance.$disconnect();
      DatabaseClient.instance = null;
    }
  }
}

// Use singleton pattern in development to prevent multiple instances
const db = globalThis.__db ?? DatabaseClient.getInstance();

if (process.env.NODE_ENV === 'development') {
  globalThis.__db = db;
}

/**
 * Database utility functions
 */
export const dbUtils = {
  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  },

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const [
        userCount,
        attendanceCount,
        classCount,
        activeSessionsCount
      ] = await Promise.all([
        db.user.count(),
        db.attendance.count(),
        db.class.count(),
        db.user.count({ where: { status: 'APPROVED' } })
      ]);

      return {
        users: userCount,
        attendance: attendanceCount,
        classes: classCount,
        activeSessions: activeSessionsCount,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  },

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      const start = Date.now();
      await db.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // This would typically be handled by Prisma CLI
      console.log('Database migrations should be run via Prisma CLI');
      console.log('Run: npx prisma migrate deploy');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  /**
   * Seed database with initial data
   */
  async seedDatabase() {
    try {
      // Check if admin user already exists
      const existingAdmin = await db.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!existingAdmin) {
        // Create default admin user
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 12);

        await db.user.create({
          data: {
            email: 'admin@face-attendance.com',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'ADMIN',
            status: 'APPROVED',
            emailVerified: new Date(),
            registrationStep: 4,
          }
        });

        console.log('Default admin user created');
      }

      // Create default locations
      const existingLocation = await db.location.findFirst();
      if (!existingLocation) {
        await db.location.createMany({
          data: [
            {
              name: 'Main Campus',
              address: 'Jl. Raya Kampus No. 1',
              wifiSSID: 'CAMPUS-MAIN',
              latitude: -6.2088,
              longitude: 106.8456,
            },
            {
              name: 'Building A - Room 101',
              address: 'Building A, Floor 1, Room 101',
              wifiSSID: 'CAMPUS-A101',
              latitude: -6.2089,
              longitude: 106.8457,
            }
          ]
        });

        console.log('Default locations created');
      }

      return { success: true, message: 'Database seeded successfully' };
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  },

  /**
   * Clean up old data
   */
  async cleanupOldData(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean up old audit logs
      const deletedAuditLogs = await db.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      // Clean up expired password reset tokens
      const deletedPasswordResets = await db.passwordResetToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return {
        auditLogsDeleted: deletedAuditLogs.count,
        passwordResetsDeleted: deletedPasswordResets.count,
      };
    } catch (error) {
      console.error('Data cleanup failed:', error);
      throw error;
    }
  }
};

/**
 * Transaction wrapper with retry logic
 */
export async function withTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        return await operation(tx as PrismaClient);
      }, {
        maxWait: DB_CONSTANTS.CONNECTION_TIMEOUT,
        timeout: DB_CONSTANTS.STATEMENT_TIMEOUT,
      });
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain types of errors
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint') ||
            error.message.includes('Foreign key constraint') ||
            error.message.includes('Check constraint')) {
          throw error;
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      }
    }
  }

  throw lastError!;
}

/**
 * Query builder helpers
 */
export const queryHelpers = {
  /**
   * Build pagination parameters
   */
  buildPagination(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return {
      skip: Math.max(0, skip),
      take: Math.min(100, limit), // Max 100 items per page
    };
  },

  /**
   * Build search filter for text fields
   */
  buildSearchFilter(searchTerm: string, fields: string[]) {
    if (!searchTerm?.trim()) return {};

    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm.trim(),
          mode: 'insensitive' as const,
        }
      }))
    };
  },

  /**
   * Build date range filter
   */
  buildDateRangeFilter(
    field: string,
    startDate?: Date | string,
    endDate?: Date | string
  ) {
    const filter: Record<string, any> = {};

    if (startDate || endDate) {
      filter[field] = {};
      
      if (startDate) {
        filter[field].gte = new Date(startDate);
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter[field].lte = end;
      }
    }

    return filter;
  },

  /**
   * Build ordering parameters
   */
  buildOrderBy(
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    return {
      [sortBy]: sortOrder
    };
  }
};

export { db };
export default db;