// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { updateUserSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = params.id

    // Users can view their own profile, admins can view any
    if (user.role !== 'ADMIN' && user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Try cache first
    const cacheKey = `user:${userId}:details`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        document: true,
        faceProfile: true,
        teachingClasses: {
          include: {
            location: true,
            _count: {
              select: {
                enrollments: true,
                attendances: true
              }
            }
          }
        },
        enrolledClasses: {
          include: {
            class: {
              include: {
                lecturer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                location: true
              }
            }
          }
        },
        attendances: {
          include: {
            class: {
              select: {
                name: true,
                code: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 10
        }
      }
    })

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate statistics
    const attendanceStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: userId },
      _count: { status: true }
    })

    const stats = {
      totalAttendance: attendanceStats.reduce((sum: number, stat: any) => sum + stat._count.status, 0),
      present: attendanceStats.find((s: any) => s.status === 'PRESENT')?._count.status || 0,
      absent: attendanceStats.find((s: any) => s.status === 'ABSENT')?._count.status || 0,
      late: attendanceStats.find((s: any) => s.status === 'LATE')?._count.status || 0,
    }

    const response = {
      success: true,
      data: {
        ...userData,
        stats
      }
    }

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = params.id
    const body = await request.json()

    // Users can update their own profile, admins can update any
    if (user.role !== 'ADMIN' && user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check email uniqueness if changed
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: userId }
        }
      })
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Update user and profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        profile: existingUser.profile ? {
          update: {
            dateOfBirth: validatedData.dateOfBirth,
            address: validatedData.address,
            emergencyContact: validatedData.emergencyContact,
            bio: validatedData.bio
          }
        } : {
          create: {
            dateOfBirth: validatedData.dateOfBirth,
            address: validatedData.address,
            emergencyContact: validatedData.emergencyContact,
            bio: validatedData.bio
          }
        }
      },
      include: {
        profile: true
      }
    })

    // Clear caches
    await redis.del(`user:${userId}:*`)
    await redis.del('users:list:*')

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const userId = params.id

    // Prevent self-deletion
    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        attendances: true,
        teachingClasses: true,
        enrolledClasses: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has data that prevents deletion
    const hasData = existingUser.attendances.length > 0 || 
                   existingUser.teachingClasses.length > 0 ||
                   existingUser.enrolledClasses.length > 0

    if (hasData) {
      // Soft delete - deactivate account
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedBy: user.id
        }
      })

      return NextResponse.json({
        success: true,
        message: 'User account suspended due to existing data'
      })
    }

    // Hard delete if no associated data
    await prisma.$transaction([
      prisma.userProfile.deleteMany({ where: { userId } }),
      prisma.document.deleteMany({ where: { userId } }),
      prisma.faceProfile.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ])

    // Clear caches
    await redis.del(`user:${userId}:*`)
    await redis.del('users:list:*')

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}