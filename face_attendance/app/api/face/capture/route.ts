// app/api/face/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { validateFaceQuality, extractFaceDescriptors } from '@/lib/face-recognition-server'
import { uploadFaceImage } from '@/lib/cloudinary'

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
    const faceImage = formData.get('faceImage') as File

    if (!faceImage) {
      return NextResponse.json(
        { error: 'Face image is required' },
        { status: 400 }
      )
    }

    // Validate face quality
    const qualityCheck = await validateFaceQuality(faceImage)
    if (!qualityCheck.isValid) {
      return NextResponse.json(
        {
          error: 'Face quality validation failed',
          issues: qualityCheck.issues,
          score: qualityCheck.score
        },
        { status: 400 }
      )
    }

    // Extract face descriptors
    const descriptors = await extractFaceDescriptors(faceImage)
    if (!descriptors || descriptors.length === 0) {
      return NextResponse.json(
        { error: 'No face detected in the image' },
        { status: 400 }
      )
    }

    // Upload to cloud storage
    const uploadResult = await uploadFaceImage(faceImage, user.id)

    // Check if user already has a face profile
    let faceProfile = await prisma.faceProfile.findFirst({
      where: { userId: user.id }
    })

    if (faceProfile) {
      // Update existing profile with new image
      const existingImages = faceProfile.images || []
      const existingDescriptors = faceProfile.descriptors || []

      // Limit to 5 images maximum
      const updatedImages = [...(existingImages as string[]), uploadResult.secure_url].slice(-5)
      const updatedDescriptors = [...(existingDescriptors as number[][]), ...descriptors].slice(-5)

      faceProfile = await prisma.faceProfile.update({
        where: { id: faceProfile.id },
        data: {
          images: updatedImages,
          faceDescriptors: JSON.parse(JSON.stringify(updatedDescriptors)),
          lastUpdated: new Date(),
          status: updatedImages.length >= 3 ? 'IN_PROGRESS' : 'NOT_ENROLLED'
        }
      })
    } else {
      // Create new face profile
      faceProfile = await prisma.faceProfile.create({
        data: {
          userId: user.id,
          images: [uploadResult.secure_url],
          faceDescriptors: JSON.parse(JSON.stringify(descriptors)),
          enrollmentImages: [uploadResult.secure_url],
          qualityScore: 0.8,
          status: 'NOT_ENROLLED',
          lastUpdated: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        faceProfileId: faceProfile.id,
        status: faceProfile.status,
        totalImages: (faceProfile.images as string[])?.length || 0,
        qualityScore: qualityCheck.score,
        isComplete: ((faceProfile.images as string[])?.length || 0) >= 3
      },
      message: faceProfile.status === 'IN_PROGRESS'
        ? 'Face profile completed and pending approval'
        : `Face image captured successfully. ${3 - ((faceProfile.images as string[])?.length || 0)} more images needed.`
    })

  } catch (error) {
    console.error('Face capture error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const faceProfile = await prisma.faceProfile.findFirst({
      where: { userId: user.id }
    })

    if (!faceProfile) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'NOT_STARTED',
          totalImages: 0,
          isComplete: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        faceProfileId: faceProfile.id,
        status: faceProfile.status,
        totalImages: (faceProfile.images as string[])?.length || 0,
        isComplete: ((faceProfile.images as string[])?.length || 0) >= 3,
        createdAt: faceProfile.createdAt,
        lastUpdated: faceProfile.lastUpdated
      }
    })

  } catch (error) {
    console.error('Face profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}