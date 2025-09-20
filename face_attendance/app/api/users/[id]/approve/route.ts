// app/api/users/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { sendApprovalEmail } from '@/lib/email'

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

    const userToApprove = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        faceProfile: true,
        documents: true
      }
    })

    if (!userToApprove) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToApprove.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    // Approve user and related data
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          approvedAt: new Date(),
          approvedById: user.id
        }
      }),
      ...(userToApprove.faceProfile ? [
        prisma.faceProfile.update({
          where: { id: userToApprove.faceProfile.id },
          data: { status: 'ENROLLED' }
        })
      ] : []),
      ...(userToApprove.documents && userToApprove.documents.length > 0 ?
        userToApprove.documents.map(doc =>
          prisma.document.update({
            where: { id: doc.id },
            data: { status: 'VERIFIED' }
          })
        ) : [])
    ])

    // Send approval email
    await sendApprovalEmail(userToApprove.email, userToApprove.name || 'User')

    return NextResponse.json({
      success: true,
      message: 'User approved successfully'
    })

  } catch (error) {
    console.error('User approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}