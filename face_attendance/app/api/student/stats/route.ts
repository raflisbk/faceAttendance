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

    // Try cache first
    const cacheKey = `student:${user.id}:stats`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json({ success: true, data: JSON.parse(cachedData) })
    }

    // Get student's enrollment and attendance data
    const [enrollments, attendanceRecords, upcomingClass] = await Promise.all([
      prisma.classEnrollment.findMany({
        where: { studentId: user.id },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      }),
      
      prisma.attendance.findMany({
        where: { studentId: user.id },
        include: {
          class: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // Get next upcoming class
      prisma.class.findFirst({
        where: {
          enrollments: {
            some: { studentId: user.id }
          },
          status: 'ACTIVE',
          schedule: {
            startTime: {
              gte: new Date()
            }
          }
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          schedule: true
        },
        orderBy: {
          schedule: {
            startTime: 'asc'
          }
        }
      })
    ])

    // Calculate statistics
    const totalClasses = enrollments.filter(e => e.class.status === 'ACTIVE').length
    const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length
    const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length
    const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length
    const totalAttendanceRecords = attendanceRecords.length
    
    const attendanceRate = totalAttendanceRecords > 0 
      ? ((presentCount + lateCount) / totalAttendanceRecords) * 100 
      : 0

    // Count today's classes
    const today = new Date()
    const todayClasses = await prisma.class.count({
      where: {
        enrollments: {
          some: { studentId: user.id }
        },
        schedule: {
          dayOfWeek: today.getDay(),
        },
        status: 'ACTIVE'
      }
    })

    const stats = {
      totalClasses,
      attendanceRate,
      presentCount,
      absentCount: absentCount,
      lateCount,
      todayClasses,
      upcomingClass: upcomingClass ? {
        id: upcomingClass.id,
        name: upcomingClass.name,
        startTime: upcomingClass.schedule?.startTime,
        location: upcomingClass.location?.name,
        canCheckIn: false // Will be determined by time and location
      } : null
    }

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(stats))

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Student stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}