// app/api/face/profile/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(
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

    const faceProfileId = params.id

    // Get face profile
    const faceProfile = await prisma.faceProfile.findUnique({
      where: { id: faceProfileId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!faceProfile) {
      return NextResponse.json(
        { error: 'Face profile not found' },
        { status: 404 }
      )
    }

    // Users can only delete their own profile, admins can delete any
    if (user.role !== 'ADMIN' && faceProfile.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if face profile is being used for active attendance
    const recentAttendance = await prisma.attendance.findFirst({
      where: {
        userId: faceProfile.userId,
        method: 'FACE_RECOGNITION',
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })

    if (recentAttendance && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete face profile with recent attendance records' },
        { status: 400 }
      )
    }

    // Delete face profile and related data
    await prisma.$transaction([
      prisma.faceQualityLog.deleteMany({
        where: { userId: faceProfile.userId }
      }),
      prisma.faceProfile.delete({
        where: { id: faceProfileId }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Face profile deleted successfully'
    })

  } catch (error) {
    console.error('Face profile deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}