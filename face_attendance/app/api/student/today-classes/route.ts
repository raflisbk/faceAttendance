import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

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
            id: true,
            name: true,
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
    const processedClasses = todayClasses.map((classItem: any) => {
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
}