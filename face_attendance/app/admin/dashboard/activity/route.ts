import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  user: {
    name: string;
    role: string;
  };
  timestamp: string;
  status: string;
}

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
          name: true,
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
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          user: {
            select: {
              name: true,
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
        orderBy: { timestamp: 'desc' },
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
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Recent face enrollments
      prisma.faceProfile.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: {
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    // Combine and format activities
    const activities: Activity[] = []

    // Add user registrations
    recentRegistrations.forEach((user: any) => {
      activities.push({
        id: `user_${user.id}`,
        type: 'USER_REGISTRATION',
        title: 'New User Registration',
        description: `${user.name || 'Unknown User'} registered as ${user.role.toLowerCase()}`,
        user: {
          name: user.name || 'Unknown User',
          role: user.role
        },
        timestamp: user.createdAt.toISOString(),
        status: user.status === 'PENDING' ? 'WARNING' : user.status === 'ACTIVE' ? 'SUCCESS' : 'ERROR'
      })
    })

    // Add attendance records
    recentAttendances.forEach((attendance: any) => {
      activities.push({
        id: `attendance_${attendance.id}`,
        type: 'ATTENDANCE_CHECKED',
        title: 'Attendance Recorded',
        description: `${attendance.user.name || 'Unknown User'} checked into ${attendance.class.name}`,
        user: {
          name: attendance.user.name || 'Unknown User',
          role: attendance.user.role
        },
        timestamp: attendance.timestamp.toISOString(),
        status: attendance.isValid ? 'SUCCESS' : 'WARNING'
      })
    })

    // Add class creations
    recentClasses.forEach((classItem: any) => {
      activities.push({
        id: `class_${classItem.id}`,
        type: 'CLASS_CREATED',
        title: 'New Class Created',
        description: `${classItem.name} (${classItem.code}) created by ${classItem.lecturer.name || 'Unknown Lecturer'}`,
        user: {
          name: classItem.lecturer.name || 'Unknown Lecturer',
          role: 'LECTURER'
        },
        timestamp: classItem.createdAt.toISOString(),
        status: 'INFO'
      })
    })

    // Add face enrollments
    recentFaceEnrollments.forEach((profile: any) => {
      activities.push({
        id: `face_${profile.id}`,
        type: 'FACE_ENROLLED',
        title: 'Face Profile Enrolled',
        description: `${profile.user.name || 'Unknown User'} completed face enrollment`,
        user: {
          name: profile.user.name || 'Unknown User',
          role: profile.user.role
        },
        timestamp: profile.createdAt.toISOString(),
        status: 'SUCCESS'
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