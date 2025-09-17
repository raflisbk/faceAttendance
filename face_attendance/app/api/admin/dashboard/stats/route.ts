// app/api/admin/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
      success: true,
      data: pendingUsers
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
        status: 'PENDING_APPROVAL'
      },
      include: {
        faceProfile: true,
        document: true
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
                approvedBy: user.id
              }
            }),
            // Approve face profile if exists
            ...(userToProcess.faceProfile ? [
              prisma.faceProfile.update({
                where: { id: userToProcess.faceProfile.id },
                data: { status: 'APPROVED' }
              })
            ] : []),
            // Approve document if exists
            ...(userToProcess.document ? [
              prisma.document.update({
                where: { id: userToProcess.document.id },
                data: { status: 'VERIFIED' }
              })
            ] : [])
          ])

          // Send approval email
          await sendApprovalEmail(userToProcess.email, userToProcess.firstName)

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
              status: 'REJECTED',
              rejectedAt: new Date(),
              rejectedBy: user.id,
              rejectionReason: reason
            }
          })

          // Send rejection email
          await sendRejectionEmail(userToProcess.email, userToProcess.firstName, reason)

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