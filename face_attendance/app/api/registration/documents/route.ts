import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helpers'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


// Upload file to Cloudinary (simplified approach)
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string,
  fileType: string
): Promise<{ url: string; publicId: string }> {
  try {
    // Different settings for images vs PDFs
    const isImage = fileType.startsWith('image/')
    const isPDF = fileType === 'application/pdf'

    // Convert buffer to base64 data URI
    const base64 = buffer.toString('base64')
    const dataURI = `data:${fileType};base64,${base64}`

    const uploadOptions: any = {
      folder: `face-attendance/${folder}`,
      public_id: `${folder}_${Date.now()}_${fileName.split('.')[0]}`,
      resource_type: isPDF ? 'raw' : 'image',
      overwrite: true
    }

    // Only apply transformations for images
    if (isImage) {
      uploadOptions.quality = 'auto:low'
      uploadOptions.format = 'webp'
      uploadOptions.transformation = [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    }

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions)

    return {
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // For registration, get registration ID from form data
    const registrationId = formData.get('registrationId') as string

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required for document upload' },
        { status: 400 }
      )
    }

    // Get file from form data
    const ktmFile = formData.get('ktm') as File | null

    // Get OCR data
    const ktmText = formData.get('ktmText') as string | null

    if (!ktmFile) {
      return NextResponse.json(
        { error: 'Student ID Card (KTM) is required' },
        { status: 400 }
      )
    }

    // Validate file type and size - support both images and PDF
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

    if (!allowedTypes.includes(ktmFile.type)) {
      return NextResponse.json(
        { error: 'Student ID Card must be an image file (JPG, PNG, WEBP) or PDF document' },
        { status: 400 }
      )
    }

    // 10MB limit for documents (including PDF)
    if (ktmFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Upload KTM file to Cloudinary
    const ktmUpload = await uploadToCloudinary(
      Buffer.from(await ktmFile.arrayBuffer()),
      ktmFile.name,
      'student-id',
      ktmFile.type
    )

    // Store document info temporarily (not in database yet)
    const documentData = {
      registrationId,
      fileName: ktmFile.name,
      filePath: ktmUpload.url,
      fileSize: ktmFile.size,
      mimeType: ktmFile.type,
      documentType: 'STUDENT_ID',
      ocrData: ktmText ? {
        extractedText: ktmText,
        extractedAt: new Date(),
        confidence: 'auto-detected',
        publicId: ktmUpload.publicId
      } : { publicId: ktmUpload.publicId },
      uploadedAt: new Date()
    }

    const result = {
      success: true,
      registrationId,
      document: documentData,
      cloudinaryUrl: ktmUpload.url,
      publicId: ktmUpload.publicId,
      message: 'Student ID Card uploaded successfully. Continue to next step to complete registration.'
    }

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Document upload error:', error)

    return NextResponse.json(
      {
        error: 'Failed to upload documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}