// app/api/admin/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
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

    // Get current date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    // Parallel queries for better performance
    const [
      // User statistics
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      adminCount,
      lecturerCount,
      studentCount,

      // Class statistics
      totalClasses,
      activeClasses,

      // Attendance statistics
      todayAttendances,
      weekAttendances,
      monthAttendances,

      // System statistics
      totalLocations,
      totalFaceProfiles
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'LECTURER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),

      // Classes
      prisma.class.count(),
      prisma.class.count({ where: { isActive: true } }),

      // Attendances
      prisma.attendance.findMany({
        where: {
          timestamp: {
            gte: today,
            lt: tomorrow
          }
        },
        select: {
          id: true,
          isValid: true
        }
      }),
      prisma.attendance.findMany({
        where: {
          timestamp: {
            gte: weekAgo
          }
        },
        select: {
          id: true,
          isValid: true
        }
      }),
      prisma.attendance.findMany({
        where: {
          timestamp: {
            gte: monthAgo
          }
        },
        select: {
          id: true,
          isValid: true
        }
      }),

      // System
      prisma.location.count(),
      prisma.faceProfile.count()
    ])

    // Calculate attendance statistics
    const todayTotal = todayAttendances.length
    const todayPresent = todayAttendances.filter((a: any) => a.isValid).length
    const todayAbsent = todayTotal - todayPresent
    const todayLate = 0 // This would need additional logic based on your business rules

    // Calculate weekly average
    const weekTotal = weekAttendances.length
    const weekPresent = weekAttendances.filter((a: any) => a.isValid).length
    const weeklyAverage = weekTotal > 0 ? (weekPresent / weekTotal) * 100 : 0

    // Calculate monthly trend (simplified)
    const monthTotal = monthAttendances.length
    const monthPresent = monthAttendances.filter((a: any) => a.isValid).length
    const monthlyAverage = monthTotal > 0 ? (monthPresent / monthTotal) * 100 : 0
    const monthlyTrend = weeklyAverage - monthlyAverage

    // Calculate average enrollment per class
    const enrollmentData = await prisma.class.findMany({
      include: {
        enrollments: true
      }
    })
    const averageEnrollment = enrollmentData.length > 0
      ? enrollmentData.reduce((sum: number, cls: any) => sum + cls.enrollments.length, 0) / enrollmentData.length
      : 0

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        suspended: suspendedUsers,
        byRole: {
          admins: adminCount,
          lecturers: lecturerCount,
          students: studentCount
        }
      },
      classes: {
        total: totalClasses,
        active: activeClasses,
        inactive: totalClasses - activeClasses,
        averageEnrollment: Math.round(averageEnrollment)
      },
      attendance: {
        todayTotal,
        todayPresent,
        todayAbsent,
        todayLate,
        weeklyAverage,
        monthlyTrend
      },
      system: {
        totalLocations,
        activeWifiNetworks: totalLocations, // Simplified: assume each location has WiFi
        faceProfiles: totalFaceProfiles,
        qrSessions: 0 // Would need QR session tracking
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { userIds, action, reason } = await request.json()

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get users to be processed
    const usersToProcess = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        status: 'PENDING'
      },
      include: {
        faceProfile: true,
        documentVerifications: true
      }
    })

    if (usersToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No pending users found with provided IDs' },
        { status: 404 }
      )
    }

    const results = []

    for (const userToProcess of usersToProcess) {
      try {
        if (action === 'approve') {
          // Approve user and related data
          await prisma.$transaction([
            prisma.user.update({
              where: { id: userToProcess.id },
              data: {
                status: 'ACTIVE',
                approvedAt: new Date(),
                approvedById: user.id
              }
            }),
            // Approve face profile if exists
            // Update document verifications if exist
            ...(userToProcess.documentVerifications?.length ? userToProcess.documentVerifications.map((doc: any) =>
              prisma.documentVerification.update({
                where: { id: doc.id },
                data: { status: 'APPROVED' }
              })
            ) : [])
          ])

          // Send approval email
          await EmailService.getInstance().sendAccountApproved(
            userToProcess.email,
            userToProcess.name,
            userToProcess.email,
            userToProcess.role,
            userToProcess.studentId || userToProcess.staffId || userToProcess.id,
            `${process.env.NEXTAUTH_URL}/login`
          )

          // Clear user cache
          await redis.del(`user:${userToProcess.id}`)

          results.push({
            userId: userToProcess.id,
            action: 'approved',
            success: true
          })
        } else {
          // Reject user
          await prisma.user.update({
            where: { id: userToProcess.id },
            data: {
              status: 'REJECTED'
            }
          })

          // Send rejection email
          await EmailService.getInstance().sendAccountRejected(
            userToProcess.email,
            userToProcess.name,
            reason || 'Your account application has been rejected',
            process.env.SUPPORT_EMAIL || 'support@faceattendance.com'
          )

          results.push({
            userId: userToProcess.id,
            action: 'rejected',
            success: true
          })
        }
      } catch (error) {
        console.error(`Error processing user ${userToProcess.id}:`, error)
        results.push({
          userId: userToProcess.id,
          action,
          success: false,
          error: 'Processing failed'
        })
      }
    }

    // Clear pending users cache
    await redis.del('admin:pending_users')

    return NextResponse.json({
      success: true,
      data: results,
      message: `${action === 'approve' ? 'Approved' : 'Rejected'} ${results.filter(r => r.success).length} users`
    })

  } catch (error) {
    console.error('Process pending users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}