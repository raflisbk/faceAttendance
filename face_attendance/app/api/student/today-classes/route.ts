import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized. Student access required.' },
        { status: 401 }
      )
    }

    const today = new Date()
    const todayDayOfWeek = today.getDay()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get today's classes for the student
    const todayClasses = await prisma.class.findMany({
      where: {
        enrollments: {
          some: { studentId: user.id }
        },
        schedule: {
          dayOfWeek: todayDayOfWeek
        },
        status: 'ACTIVE'
      },
      include: {
        lecturer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        location: {
          select: {
            name: true,
            building: true,
            wifiSSID: true
          }
        },
        schedule: true,
        attendances: {
          where: {
            studentId: user.id,
            date: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        }
      },
      orderBy: {
        schedule: {
          startTime: 'asc'
        }
      }
    })

    // Process classes to add check-in status and timing info
    const processedClasses = todayClasses.map(classItem => {
      const attendance = classItem.attendances[0] // Today's attendance if exists
      const now = new Date()
      const classStartTime = new Date(classItem.schedule?.startTime || now)
      const classEndTime = new Date(classItem.schedule?.endTime || now)
      
      // Check if class is in session (30 minutes before to 15 minutes after start)
      const checkInWindowStart = new Date(classStartTime.getTime() - 30 * 60 * 1000)
      const checkInWindowEnd = new Date(classStartTime.getTime() + 15 * 60 * 1000)
      const canCheckIn = now >= checkInWindowStart && now <= checkInWindowEnd && !attendance
      
      const isInSession = now >= classStartTime && now <= classEndTime

      return {
        id: classItem.id,
        name: classItem.name,
        code: classItem.code,
        lecturer: {
          name: `${classItem.lecturer.firstName} ${classItem.lecturer.lastName}`
        },
        location: classItem.location,
        schedule: classItem.schedule,
        attendance: attendance ? {
          status: attendance.status,
          checkInTime: attendance.checkInTime?.toISOString()
        } : null,
        canCheckIn,
        isInSession
      }
    })

    return NextResponse.json({
      success: true,
      data: processedClasses
    })

  } catch (error) {
    console.error('Student today classes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}Response.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Try cache first
    const cacheKey = 'admin:dashboard:stats'
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json({ success: true, data: JSON.parse(cachedData) })
    }

    // Get current date ranges
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Parallel queries for better performance
    const [
      userStats,
      classStats,
      todayAttendance,
      weeklyAttendance,
      monthlyAttendance,
      lastMonthAttendance,
      systemStats
    ] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ['role', 'status'],
        _count: { id: true }
      }),
      
      // Class statistics
      prisma.class.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      
      // Today's attendance
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _count: { status: true }
      }),
      
      // Weekly attendance
      prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfWeek
          }
        },
        select: { status: true }
      }),
      
      // Monthly attendance
      prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfMonth
          }
        },
        select: { status: true }
      }),
      
      // Last month attendance for trend
      prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfLastMonth,
            lt: startOfMonth
          }
        },
        select: { status: true }
      }),
      
      // System statistics
      Promise.all([
        prisma.location.count(),
        prisma.location.count({ where: { status: 'ACTIVE' } }),
        prisma.faceProfile.count({ where: { status: 'APPROVED' } }),
        prisma.qrCodeSession.count({ where: { isActive: true } })
      ])
    ])

    // Process user statistics
    const userStatsProcessed = {
      total: 0,
      active: 0,
      pending: 0,
      suspended: 0,
      byRole: {
        admins: 0,
        lecturers: 0,
        students: 0
      }
    }

    userStats.forEach(stat => {
      const count = stat._count.id
      userStatsProcessed.total += count
      
      if (stat.status === 'ACTIVE') userStatsProcessed.active += count
      if (stat.status === 'PENDING_APPROVAL') userStatsProcessed.pending += count
      if (stat.status === 'SUSPENDED') userStatsProcessed.suspended += count
      
      if (stat.role === 'ADMIN') userStatsProcessed.byRole.admins += count
      if (stat.role === 'LECTURER') userStatsProcessed.byRole.lecturers += count
      if (stat.role === 'STUDENT') userStatsProcessed.byRole.students += count
    })

    // Process class statistics
    const classStatsProcessed = {
      total: 0,
      active: 0,
      inactive: 0,
      averageEnrollment: 0
    }

    classStats.forEach(stat => {
      const count = stat._count.id
      classStatsProcessed.total += count
      
      if (stat.status === 'ACTIVE') classStatsProcessed.active += count
      if (stat.status === 'INACTIVE') classStatsProcessed.inactive += count
    })

    // Calculate average enrollment
    if (classStatsProcessed.active > 0) {
      const enrollmentStats = await prisma.classEnrollment.groupBy({
        by: ['classId'],
        _count: { studentId: true }
      })
      
      const totalEnrollments = enrollmentStats.reduce((sum, stat) => sum + stat._count.studentId, 0)
      classStatsProcessed.averageEnrollment = totalEnrollments / classStatsProcessed.active
    }

    // Process attendance statistics
    const todayAttendanceProcessed = {
      todayTotal: 0,
      todayPresent: 0,
      todayAbsent: 0,
      todayLate: 0,
      weeklyAverage: 0,
      monthlyTrend: 0
    }

    todayAttendance.forEach(stat => {
      const count = stat._count.status
      todayAttendanceProcessed.todayTotal += count
      
      if (stat.status === 'PRESENT') todayAttendanceProcessed.todayPresent += count
      if (stat.status === 'ABSENT') todayAttendanceProcessed.todayAbsent += count
      if (stat.status === 'LATE') todayAttendanceProcessed.todayLate += count
    })

    // Calculate weekly average
    const weeklyPresent = weeklyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const weeklyTotal = weeklyAttendance.length
    todayAttendanceProcessed.weeklyAverage = weeklyTotal > 0 ? (weeklyPresent / weeklyTotal) * 100 : 0

    // Calculate monthly trend
    const monthlyPresent = monthlyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const monthlyTotal = monthlyAttendance.length
    const lastMonthPresent = lastMonthAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const lastMonthTotal = lastMonthAttendance.length

    const currentMonthRate = monthlyTotal > 0 ? (monthlyPresent / monthlyTotal) * 100 : 0
    const lastMonthRate = lastMonthTotal > 0 ? (lastMonthPresent / lastMonthTotal) * 100 : 0
    todayAttendanceProcessed.monthlyTrend = currentMonthRate - lastMonthRate

    // Process system statistics
    const [totalLocations, activeWifiNetworks, faceProfiles, qrSessions] = systemStats
    const systemStatsProcessed = {
      totalLocations,
      activeWifiNetworks,
      faceProfiles,
      qrSessions
    }

    const dashboardStats = {
      users: userStatsProcessed,
      classes: classStatsProcessed,
      attendance: todayAttendanceProcessed,
      system: systemStatsProcessed
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(dashboardStats))

    return NextResponse.json({
      success: true,
      data: dashboardStats
    })

  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
