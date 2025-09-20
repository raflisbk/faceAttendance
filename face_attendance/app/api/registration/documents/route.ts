import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helpers'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Convert buffer to stream for Cloudinary upload
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable({
    read() {
      this.push(buffer)
      this.push(null)
    }
  })
  return readable
}

// Upload file to Cloudinary (optimized for speed)
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string,
  fileType: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    // Different settings for images vs PDFs
    const isImage = fileType.startsWith('image/')
    const isPDF = fileType === 'application/pdf'

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
      uploadOptions.eager = [
        { width: 300, height: 300, crop: 'thumb', gravity: 'center' }
      ]
      uploadOptions.eager_async = true
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          })
        } else {
          reject(new Error('Upload failed'))
        }
      }
    )

    bufferToStream(buffer).pipe(stream)
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // For registration, get user ID from form data instead of auth
    const userId = formData.get('userId') as string

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for registration' },
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

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upload KTM file to Cloudinary
      const ktmUpload = await uploadToCloudinary(
        Buffer.from(await ktmFile.arrayBuffer()),
        ktmFile.name,
        'student-id',
        ktmFile.type
      )

      // Save document to database
      const document = await tx.document.create({
        data: {
          userId,
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
          status: 'PENDING_VERIFICATION'
        }
      })

      // Update user registration step
      await tx.user.update({
        where: { id: userId },
        data: {
          registrationStep: 3,
          documentVerified: false // Will be verified by admin
        }
      })

      // Update registration step record
      await tx.registrationStep.upsert({
        where: {
          userId_stepName: {
            userId,
            stepName: 'DOCUMENT_UPLOAD'
          }
        },
        update: {
          status: 'COMPLETED',
          data: {
            document: {
              id: document.id,
              type: document.documentType,
              fileName: document.fileName,
              uploadedAt: document.createdAt,
              cloudinaryUrl: ktmUpload.url,
              publicId: ktmUpload.publicId
            }
          },
          completedAt: new Date()
        },
        create: {
          userId,
          stepName: 'DOCUMENT_UPLOAD',
          status: 'COMPLETED',
          data: {
            document: {
              id: document.id,
              type: document.documentType,
              fileName: document.fileName,
              uploadedAt: document.createdAt,
              cloudinaryUrl: ktmUpload.url,
              publicId: ktmUpload.publicId
            }
          },
          completedAt: new Date()
        }
      })

      return {
        success: true,
        document,
        cloudinaryUrl: ktmUpload.url,
        publicId: ktmUpload.publicId,
        message: 'Student ID Card uploaded successfully'
      }
    })

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