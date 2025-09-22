import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationId, step1Data, step2Data, step3Data, step4Data } = body

    if (!registrationId || !step1Data || !step2Data || !step4Data) {
      return NextResponse.json(
        { error: 'Missing required registration data' },
        { status: 400 }
      )
    }

    if (!step4Data.password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Check if email already exists in final users table
    const existingUser = await prisma.user.findUnique({
      where: { email: step1Data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check if student/staff ID already exists
    const existingId = await prisma.user.findUnique({
      where: step1Data.role === 'STUDENT'
        ? { studentId: step1Data.studentId }
        : { staffId: step1Data.studentId }
    })

    if (existingId) {
      return NextResponse.json(
        { error: `${step1Data.role === 'STUDENT' ? 'Student' : 'Staff'} ID already registered` },
        { status: 400 }
      )
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(step4Data.password, 12)

    // Start database transaction to create everything
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const userData = {
        name: step1Data.name,
        email: step1Data.email,
        phone: step1Data.phone,
        password: hashedPassword,
        role: step1Data.role,
        status: 'PENDING' as const,
        registrationStep: 5, // Completed with password
        faceEnrollmentStatus: step3Data ? 'ENROLLED' as const : 'NOT_ENROLLED' as const,
        documentVerified: false, // Will be verified by admin
        termsAccepted: step4Data.hasAcceptedTerms || true,
        gdprConsent: step4Data.hasAcceptedTerms || true,
        ...(step1Data.role === 'STUDENT'
          ? { studentId: step1Data.studentId }
          : { staffId: step1Data.studentId })
      }

      const user = await tx.user.create({
        data: userData
      })

      // Create registration step records
      await tx.registrationStep.createMany({
        data: [
          {
            userId: user.id,
            stepName: 'BASIC_INFO' as const,
            status: 'COMPLETED' as const,
            data: step1Data,
            completedAt: new Date()
          },
          {
            userId: user.id,
            stepName: 'DOCUMENT_UPLOAD' as const,
            status: 'COMPLETED' as const,
            data: step2Data,
            completedAt: new Date()
          },
          ...(step3Data ? [{
            userId: user.id,
            stepName: 'FACE_ENROLLMENT' as const,
            status: 'COMPLETED' as const,
            data: step3Data,
            completedAt: new Date()
          }] : []),
          {
            userId: user.id,
            stepName: 'PASSWORD_SETUP' as const,
            status: 'COMPLETED' as const,
            data: {
              hasAcceptedTerms: step4Data.hasAcceptedTerms,
              passwordSetAt: new Date().toISOString()
            },
            completedAt: new Date()
          }
        ]
      })

      // Import cloudinary here
      const { v2: cloudinary } = await import('cloudinary')

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })

      // TODO: Upload document to Cloudinary when signature issues are resolved
      if (step2Data.document && step2Data.document.fileData) {
        await tx.document.create({
          data: {
            userId: user.id,
            fileName: step2Data.document.fileName,
            filePath: '/temp/documents/placeholder.pdf', // Temporary placeholder
            fileSize: step2Data.document.fileSize,
            mimeType: step2Data.document.mimeType,
            documentType: 'STUDENT_ID' as const,
            ocrData: step2Data.document.ocrData || {},
            status: 'PENDING_VERIFICATION' as const
          }
        })
      }

      // TODO: Upload face images to Cloudinary when signature issues are resolved
      if (step3Data && step3Data.faceImages && step3Data.faceImages.length > 0) {
        const placeholderImages = step3Data.faceImages.map((_: any, i: number) => ({
          url: `/temp/faces/face_${user.id}_${i + 1}.jpg`,
          index: i + 1,
          quality: step3Data.enrollmentQuality || 75
        }))

        // Create face profile with temporary placeholders
        await tx.faceProfile.create({
          data: {
            userId: user.id,
            faceDescriptors: [], // Will be generated by face recognition system later
            enrollmentImages: placeholderImages,
            images: placeholderImages.map((img: any) => img.url), // For backward compatibility
            qualityScore: step3Data.enrollmentQuality || 75,
            confidenceThreshold: 0.6,
            status: 'ENROLLED' as const,
            lastUpdated: new Date()
          }
        })
      }

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          registrationStep: user.registrationStep
        },
        message: 'Registration completed successfully!'
      }
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Registration completion error:', error)

    return NextResponse.json(
      {
        error: 'Failed to complete registration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}