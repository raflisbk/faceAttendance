import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get recent activities from multiple tables
    const [
      recentRegistrations,
      recentAttendances,
      recentClasses,
      recentFaceEnrollments
    ] = await Promise.all([
      // Recent user registrations
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Recent attendance records
      prisma.attendance.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          },
          class: {
            select: {
              name: true,
              code: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      }),
      
      // Recent class creations
      prisma.class.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          lecturer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Recent face enrollments
      prisma.faceProfile.findMany({
        where: {
          enrolledAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' },
        take: 10
      })
    ])

    // Combine and format activities
    const activities = []

    // Add user registrations
    recentRegistrations.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'USER_REGISTRATION',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} registered as ${user.role.toLowerCase()}`,
        user: {
          name: `${user.firstName} ${user.lastName}`,
          role: user.role
        },
        timestamp: user.createdAt.toISOString(),
        status: user.status === 'PENDING_APPROVAL' ? 'WARNING' : 'SUCCESS'
      })
    })

    // Add attendance records
    recentAttendances.forEach(attendance => {
      activities.push({
        id: `attendance_${attendance.id}`,
        type: 'ATTENDANCE_CHECKED',
        title: 'Attendance Recorded',
        description: `${attendance.student.firstName} ${attendance.student.lastName} checked into ${attendance.class.name}`,
        user: {
          name: `${attendance.student.firstName} ${attendance.student.lastName}`,
          role: attendance.student.role
        },
        timestamp: attendance.date.toISOString(),
        status: attendance.status === 'PRESENT' ? 'SUCCESS' : attendance.status === 'LATE' ? 'WARNING' : 'ERROR'
      })
    })

    // Add class creations
    recentClasses.forEach(classItem => {
      activities.push({
        id: `class_${classItem.id}`,
        type: 'CLASS_CREATED',
        title: 'New Class Created',
        description: `${classItem.name} (${classItem.code}) created by ${classItem.lecturer.firstName} ${classItem.lecturer.lastName}`,
        user: {
          name: `${classItem.lecturer.firstName} ${classItem.lecturer.lastName}`,
          role: 'LECTURER'
        },
        timestamp: classItem.createdAt.toISOString(),
        status: 'INFO'
      })
    })

    // Add face enrollments
    recentFaceEnrollments.forEach(profile => {
      activities.push({
        id: `face_${profile.id}`,
        type: 'FACE_ENROLLED',
        title: 'Face Profile Enrolled',
        description: `${profile.user.firstName} ${profile.user.lastName} completed face enrollment`,
        user: {
          name: `${profile.user.firstName} ${profile.user.lastName}`,
          role: profile.user.role
        },
        timestamp: profile.enrolledAt?.toISOString() || new Date().toISOString(),
        status: profile.status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
      })
    })

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: sortedActivities
    })

  } catch (error) {
    console.error('Admin dashboard activity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}