import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Get pending users with their documents and face profiles
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      },
      include: {
        profile: true,
        document: true,
        faceProfile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return Next