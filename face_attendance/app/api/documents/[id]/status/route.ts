// app/api/documents/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

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

    const documentId = params.id

    // Try cache first
    const cacheKey = `document:${documentId}:status`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Users can only view their own documents, admins can view any
    if (user.role !== 'ADMIN' && document.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const response = {
      success: true,
      data: {
        id: document.id,
        type: document.documentType,
        fileName: document.fileName,
        status: document.status,
        uploadedAt: document.createdAt,
        verifiedAt: document.verifiedAt,
        verifiedBy: document.verifiedById,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        ocrData: document.ocrData,
        rejectionReason: document.rejectionReason,
        // Only show URL to document owner or admin
        filePath: (user.role === 'ADMIN' || document.userId === user.id) ? document.filePath : null
      }
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Document status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}