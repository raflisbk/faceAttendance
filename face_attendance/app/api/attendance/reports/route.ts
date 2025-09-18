// app/api/attendance/reports/route.ts
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
    const reportType = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const classId = searchParams.get('classId')
    const studentId = searchParams.get('studentId')

    // Build cache key
    const cacheKey = `attendance_reports:${user.role}:${user.id}:${reportType}:${startDate || 'any'}:${endDate || 'any'}:${classId || 'all'}:${studentId || 'all'}`
    
    // Try cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    let whereClause: any = {}

    // Date filter
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    // Class filter
    if (classId) {
      whereClause.classId = classId
    }

    // Role-based filtering
    if (user.role === 'STUDENT') {
      whereClause.studentId = user.id
    } else if (user.role === 'LECTURER') {
      whereClause.class = {
        lecturerId: user.id
      }
    }

    // Student filter (for admin/lecturer)
    if (studentId && (user.role === 'ADMIN' || user.role === 'LECTURER')) {
      whereClause.studentId = studentId
    }

    let reportData: any = {}

    switch (reportType) {
      case 'summary':
        const summaryStats = await prisma.attendance.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true }
        })

        const totalSessions = summaryStats.reduce((sum, stat) => sum + stat._count.status, 0)
        const presentCount = summaryStats.find(s => s.status === 'PRESENT')?._count.status || 0
        const lateCount = summaryStats.find(s => s.status === 'LATE')?._count.status || 0
        const absentCount = summaryStats.find(s => s.status === 'ABSENT')?._count.status || 0
        const excusedCount = summaryStats.find(s => s.status === 'EXCUSED')?._count.status || 0
        
        const attendanceRate = totalSessions > 0 ? ((presentCount + lateCount) / totalSessions) * 100 : 0

        reportData = {
          summary: {
            totalSessions,
            presentCount,
            lateCount,
            absentCount,
            excusedCount,
            attendanceRate: Math.round(attendanceRate * 100) / 100
          }
        }
        break

      case 'detailed':
        const detailedRecords = await prisma.attendance.findMany({
          where: whereClause,
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                studentId: true
              }
            },
            class: {
              select: {
                name: true,
                code: true,
                lecturer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        })

        reportData = {
          records: detailedRecords,
          count: detailedRecords.length
        }
        break

      case 'trends':
        // Daily attendance trends for the last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const trendData = await prisma.attendance.groupBy({
          by: ['date', 'status'],
          where: {
            ...whereClause,
            date: {
              gte: thirtyDaysAgo,
              ...whereClause.date
            }
          },
          _count: { status: true },
          orderBy: {
            date: 'asc'
          }
        })

        // Process trend data into daily summaries
        const dailyTrends = trendData.reduce((acc: any, item) => {
          const dateKey = item.date.toISOString().split('T')[0]
          if (!acc[dateKey]) {
            acc[dateKey] = { date: dateKey, present: 0, late: 0, absent: 0, total: 0 }
          }
          
          acc[dateKey][item.status.toLowerCase()] += item._count.status
          acc[dateKey].total += item._count.status
          
          return acc
        }, {})

        reportData = {
          trends: Object.values(dailyTrends)
        }
        break

      case 'class_performance':
        if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
          return NextResponse.json(
            { error: 'Unauthorized for this report type' },
            { status: 403 }
          )
        }

        const classPerformance = await prisma.class.findMany({
          where: user.role === 'LECTURER' ? { lecturerId: user.id } : {},
          include: {
            attendances: {
              where: whereClause.date ? { date: whereClause.date } : {}
            },
            enrollments: true,
            _count: {
              select: {
                attendances: true,
                enrollments: true
              }
            }
          }
        })

        const performanceData = classPerformance.map(cls => {
          const totalSessions = cls.attendances.length
          const presentSessions = cls.attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
          const rate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0

          return {
            classId: cls.id,
            className: cls.name,
            classCode: cls.code,
            totalStudents: cls._count.enrollments,
            totalSessions,
            averageAttendanceRate: Math.round(rate * 100) / 100
          }
        })

        reportData = {
          classPerformance: performanceData
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    const response = {
      success: true,
      data: reportData,
      reportType,
      generatedAt: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        classId,
        studentId
      }
    }

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Attendance reports error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
