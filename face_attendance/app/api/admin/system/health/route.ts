import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const healthChecks = []

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`
      healthChecks.push({
        service: 'Database',
        status: 'healthy',
        responseTime: Date.now()
      })
    } catch (error) {
      healthChecks.push({
        service: 'Database',
        status: 'unhealthy',
        error: 'Connection failed'
      })
    }

    // Redis health check
    try {
      const start = Date.now()
      await redis.ping()
      healthChecks.push({
        service: 'Redis Cache',
        status: 'healthy',
        responseTime: Date.now() - start
      })
    } catch (error) {
      healthChecks.push({
        service: 'Redis Cache',
        status: 'unhealthy',
        error: 'Connection failed'
      })
    }

    // Face recognition service health (if implemented)
    try {
      // Add your face recognition service health check here
      healthChecks.push({
        service: 'Face Recognition',
        status: 'healthy',
        note: 'Client-side processing'
      })
    } catch (error) {
      healthChecks.push({
        service: 'Face Recognition',
        status: 'unhealthy',
        error: 'Service unavailable'
      })
    }

    // Overall system health
    const overallHealth = healthChecks.every(check => check.status === 'healthy')

    return NextResponse.json({
      success: true,
      data: {
        overall: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: healthChecks
      }
    })

  } catch (error) {
    console.error('System health check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
