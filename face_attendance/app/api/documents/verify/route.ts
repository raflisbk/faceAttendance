// app/api/documents/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { verifyDocument } from '@/lib/document-verification'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { documentId, action, notes } = await request.json()

    if (!['approve', 'reject', 'request_reupload'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or request_reupload' },
        { status: 400 }
      )
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

    let updateData: any = {
      verifiedAt: new Date(),
      verifiedBy: user.id,
      verificationNotes: notes
    }

    let message = ''

    switch (action) {
      case 'approve':
        updateData.status = 'VERIFIED'
        message = 'Document verified successfully'
        break
      
      case 'reject':
        updateData.status = 'REJECTED'
        message = 'Document rejected'
        break
      
      case 'request_reupload':
        updateData.status = 'REUPLOAD_REQUIRED'
        message = 'Reupload requested'
        break
    }

    // Perform advanced verification checks if approving
    if (action === 'approve') {
      try {
        // Perform document verification using the existing document file path
        const documentUrl = document.filePath
        const expectedData = {
          name: document.user.name,
          email: document.user.email
        }

        // TODO: Implement file fetching for document verification
        // For now, skip advanced verification and approve based on manual review
        updateData.status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      } catch (error) {
        console.warn('Advanced verification failed:', error)
        // Continue with manual approval
      }
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData
    })

    // Send notification email to user
    // await sendDocumentStatusEmail(document.user.email, document.user.firstName, action, notes)

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message
    })

  } catch (error) {
    console.error('Document verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}