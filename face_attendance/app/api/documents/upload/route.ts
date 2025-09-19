// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { extractTextFromDocument } from '@/lib/ocr'
import { validateDocumentSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const documentType = formData.get('documentType') as string
    const documentNumber = formData.get('documentNumber') as string
    const documentFile = formData.get('documentFile') as File
    const expiryDate = formData.get('expiryDate') as string

    if (!documentFile) {
      return NextResponse.json(
        { error: 'Document file is required' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(documentFile.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and PDF files are allowed' },
        { status: 400 }
      )
    }

    if (documentFile.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate document data
    const validatedData = validateDocumentSchema.parse({
      documentType,
      documentNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null
    })

    // Check for existing document
    const existingDocument = await prisma.document.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING_VERIFICATION', 'VERIFIED'] }
      }
    })

    if (existingDocument) {
      return NextResponse.json(
        { error: 'You already have a document pending verification or verified' },
        { status: 400 }
      )
    }

    // Upload document to Cloudinary
    const documentUploadResult = await uploadToCloudinary(documentFile, {
      folder: 'documents',
      resource_type: 'auto'
    })
    const documentUrl = documentUploadResult.secure_url

    // Extract text from document using OCR
    let extractedText = ''
    let ocrConfidence = 0

    try {
      const ocrResult = await extractTextFromDocument(documentUrl)
      extractedText = ocrResult.text
      ocrConfidence = ocrResult.confidence
    } catch (error) {
      console.warn('OCR extraction failed:', error)
      // Continue without OCR data
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: validatedData.documentType,
        number: validatedData.documentNumber,
        url: documentUrl,
        expiryDate: validatedData.expiryDate,
        extractedText,
        ocrConfidence,
        status: 'PENDING_VERIFICATION',
        uploadedAt: new Date()
      }
    })

    // Auto-verify if OCR confidence is high and data matches
    if (ocrConfidence > 85 && extractedText.includes(validatedData.documentNumber)) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          autoVerified: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: document.id,
        type: document.type,
        status: document.status,
        uploadedAt: document.uploadedAt,
        ocrConfidence,
        autoVerified: ocrConfidence > 85
      },
      message: 'Document uploaded successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}