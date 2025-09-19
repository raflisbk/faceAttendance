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
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get pending users
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationSteps: true,
        createdAt: true,
        image: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: {
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      data: pendingUsers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Get pending users error:', error)
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

    const { userId, action, reason } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and action' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Find the pending user
    const pendingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (pendingUser.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    // Update user status
    const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED'
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: newStatus,
        approvedAt: action === 'approve' ? new Date() : null,
        approvedById: user.id
      }
    })

    // Create approval/rejection record for audit
    await prisma.userApproval.create({
      data: {
        userId: userId,
        adminId: user.id,
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reason: reason || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`,
        reviewedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        status: updatedUser.status,
        action
      },
      message: `User ${action}d successfully`
    })

  } catch (error) {
    console.error('User approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}