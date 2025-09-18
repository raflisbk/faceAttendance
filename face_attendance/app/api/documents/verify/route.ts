// app/api/documents/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { performAdvancedDocumentVerification } from '@/lib/document-verification'

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
            firstName: true,
            lastName: true,
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
        const advancedVerification = await performAdvancedDocumentVerification(document)
        updateData.verificationScore = advancedVerification.score
        updateData.verificationDetails = advancedVerification.details
        
        if (advancedVerification.score < 70) {
          updateData.status = 'NEEDS_REVIEW'
          message = 'Document needs additional review due to low verification score'
        }
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