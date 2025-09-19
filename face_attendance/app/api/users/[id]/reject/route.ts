// app/api/users/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { sendRejectionEmail } from '@/lib/email'

export async function POST(
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
    const { reason } = await request.json()

    const userToReject = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToReject) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToReject.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: user.id,
        rejectionReason: reason
      }
    })

    // Send rejection email
    await sendRejectionEmail(userToReject.email, userToReject.firstName, reason)

    return NextResponse.json({
      success: true,
      message: 'User rejected successfully'
    })

  } catch (error) {
    console.error('User rejection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}