import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Build cache key
    const cacheKey = `attendance_history:${user.id}:${page}:${limit}:${classId || 'all'}:${startDate || 'any'}:${endDate || 'any'}:${status || 'all'}`

    // Try to get from cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause
    const whereClause: any = {
      studentId: user.id
    }

    if (classId) {
      whereClause.classId = classId
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    if (status) {
      whereClause.status = status
    }

    // Get attendance records
    const [attendanceRecords, totalCount] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              code: true,
              lecturer: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.attendance.count({ where: whereClause })
    ])

    // Calculate statistics
    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: user.id },
      _count: {
        status: true
      }
    })

    const attendanceStats = {
      total: totalCount,
      present: stats.find((s: any) => s.status === 'PRESENT')?._count.status || 0,
      absent: stats.find((s: any) => s.status === 'ABSENT')?._count.status || 0,
      late: stats.find((s: any) => s.status === 'LATE')?._count.status || 0,
      excused: stats.find((s: any) => s.status === 'EXCUSED')?._count.status || 0
    }

    const response = {
      success: true,
      data: attendanceRecords,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: attendanceStats
    }

    // Cache the response for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Attendance history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}