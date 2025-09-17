// app/api/face/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { validateFaceQuality, extractFaceDescriptors } from '@/lib/face-recognition'
import { z } from 'zod'

const faceCaptureSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  captureType: z.enum(['ENROLLMENT', 'VERIFICATION', 'RE_ENROLLMENT']).default('VERIFICATION'),
  qualityCheck: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = faceCaptureSchema.parse(body)
    
    const { imageData, captureType, qualityCheck } = validatedData

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Validate image format and size
    if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        { error: 'Image size too large. Maximum 5MB allowed.' },
        { status: 400 }
      )
    }

    let qualityResult = null
    if (qualityCheck) {
      // Validate face quality
      qualityResult = await validateFaceQuality(imageBuffer)
      
      if (!qualityResult.isValid) {
        return NextResponse.json({
          success: false,
          error: 'Face quality validation failed',
          qualityIssues: qualityResult.issues,
          suggestions: qualityResult.suggestions
        }, { status: 400 })
      }
    }

    // Extract face descriptors
    const faceDescriptors = await extractFaceDescriptors(imageBuffer)
    
    if (!faceDescriptors || faceDescriptors.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No face detected in the image',
        suggestions: [
          'Ensure your face is clearly visible',
          'Check lighting conditions',
          'Position your face in the center of the image',
          'Remove any obstructions (glasses, mask, hat)'
        ]
      }, { status: 400 })
    }

    if (faceDescriptors.length > 1) {
      return NextResponse.json({
        success: false,
        error: 'Multiple faces detected',
        suggestions: [
          'Ensure only one person is in the frame',
          'Remove other people from the background'
        ]
      }, { status: 400 })
    }

    // Upload image to Cloudinary for storage
    const imageUrl = await uploadToCloudinary(imageBuffer, 'face-captures')

    // Store temporary capture data if this is for enrollment
    if (captureType === 'ENROLLMENT' || captureType === 'RE_ENROLLMENT') {
      const captureId = `face_capture_${user.id}_${Date.now()}`
      
      await redis.setex(
        captureId,
        1800, // 30 minutes
        JSON.stringify({
          userId: user.id,
          imageUrl,
          descriptors: faceDescriptors[0],
          quality: qualityResult,
          captureType,
          timestamp: new Date().toISOString()
        })
      )

      return NextResponse.json({
        success: true,
        captureId,
        imageUrl,
        quality: qualityResult,
        descriptors: faceDescriptors[0],
        message: 'Face captured successfully'
      })
    }

    // For verification, return the descriptors directly
    return NextResponse.json({
      success: true,
      imageUrl,
      descriptors: faceDescriptors[0],
      quality: qualityResult,
      message: 'Face processed successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Face capture error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/face/enrollment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { calculateFaceProfileQuality } from '@/lib/face-recognition'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { captureIds, consentGiven } = await request.json()

    if (!Array.isArray(captureIds) || captureIds.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 face captures are required for enrollment' },
        { status: 400 }
      )
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Face data processing consent is required' },
        { status: 400 }
      )
    }

    // Retrieve all capture data
    const captureData = []
    for (const captureId of captureIds) {
      const data = await redis.get(captureId)
      if (data) {
        captureData.push(JSON.parse(data))
      }
    }

    if (captureData.length !== captureIds.length) {
      return NextResponse.json(
        { error: 'Some face captures have expired. Please retake the photos.' },
        { status: 400 }
      )
    }

    // Validate all captures belong to the same user
    const allSameUser = captureData.every(capture => capture.userId === user.id)
    if (!allSameUser) {
      return NextResponse.json(
        { error: 'Invalid capture data' },
        { status: 400 }
      )
    }

    // Calculate overall quality score
    const qualityScore = calculateFaceProfileQuality(captureData.map(c => c.quality))
    
    if (qualityScore < 70) { // Minimum quality threshold
      return NextResponse.json(
        { error: 'Face profile quality is too low. Please retake photos with better lighting and positioning.' },
        { status: 400 }
      )
    }

    // Check if user already has a face profile
    const existingProfile = await prisma.faceProfile.findFirst({
      where: { userId: user.id }
    })

    let faceProfile
    if (existingProfile) {
      // Update existing profile (re-enrollment)
      faceProfile = await prisma.faceProfile.update({
        where: { id: existingProfile.id },
        data: {
          images: captureData.map(c => c.imageUrl),
          descriptors: captureData.map(c => c.descriptors),
          quality: qualityScore,
          consentGiven,
          status: 'PENDING_APPROVAL',
          enrolledAt: new Date(),
          version: { increment: 1 }
        }
      })
    } else {
      // Create new profile
      faceProfile = await prisma.faceProfile.create({
        data: {
          userId: user.id,
          images: captureData.map(c => c.imageUrl),
          descriptors: captureData.map(c => c.descriptors),
          quality: qualityScore,
          consentGiven,
          status: 'PENDING_APPROVAL',
          enrolledAt: new Date(),
          version: 1
        }
      })
    }

    // Clean up temporary capture data
    for (const captureId of captureIds) {
      await redis.del(captureId)
    }

    // Cache the new profile
    await redis.setex(
      `face_profile:${user.id}`,
      3600, // 1 hour
      JSON.stringify(faceProfile)
    )

    return NextResponse.json({
      success: true,
      faceProfile: {
        id: faceProfile.id,
        quality: faceProfile.quality,
        status: faceProfile.status,
        imageCount: faceProfile.images.length,
        enrolledAt: faceProfile.enrolledAt
      },
      message: 'Face enrollment completed successfully. Pending admin approval.'
    })

  } catch (error) {
    console.error('Face enrollment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/face/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { compareFaceDescriptors } from '@/lib/face-recognition'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { faceDescriptors, threshold = 0.6 } = await request.json()

    if (!faceDescriptors) {
      return NextResponse.json(
        { error: 'Face descriptors are required' },
        { status: 400 }
      )
    }

    // Get user's face profile
    let faceProfile = null
    
    // Try cache first
    const cachedProfile = await redis.get(`face_profile:${user.id}`)
    if (cachedProfile) {
      faceProfile = JSON.parse(cachedProfile)
    } else {
      // Get from database
      faceProfile = await prisma.faceProfile.findFirst({
        where: { 
          userId: user.id,
          status: 'APPROVED'
        }
      })
      
      if (faceProfile) {
        // Cache for future use
        await redis.setex(
          `face_profile:${user.id}`,
          3600,
          JSON.stringify(faceProfile)
        )
      }
    }

    if (!faceProfile) {
      return NextResponse.json({
        success: false,
        error: 'No approved face profile found',
        requiresEnrollment: true
      }, { status: 404 })
    }

    // Compare with stored descriptors
    const storedDescriptors = faceProfile.descriptors
    let bestMatch = { confidence: 0, isMatch: false }

    for (const storedDescriptor of storedDescriptors) {
      const confidence = await compareFaceDescriptors(faceDescriptors, storedDescriptor)
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          confidence,
          isMatch: confidence >= threshold
        }
      }
    }

    // Log verification attempt
    await prisma.faceVerificationLog.create({
      data: {
        userId: user.id,
        faceProfileId: faceProfile.id,
        confidence: bestMatch.confidence,
        isSuccessful: bestMatch.isMatch,
        threshold,
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      verification: {
        isMatch: bestMatch.isMatch,
        confidence: bestMatch.confidence,
        threshold,
        profileQuality: faceProfile.quality
      },
      message: bestMatch.isMatch 
        ? 'Face verification successful' 
        : 'Face verification failed'
    })

  } catch (error) {
    console.error('Face verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/face/liveness-check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { performLivenessCheck } from '@/lib/face-recognition'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { imageSequence, challengeType } = await request.json()

    if (!imageSequence || !Array.isArray(imageSequence)) {
      return NextResponse.json(
        { error: 'Image sequence is required for liveness check' },
        { status: 400 }
      )
    }

    // Perform liveness detection
    const livenessResult = await performLivenessCheck(imageSequence, challengeType)

    if (!livenessResult.isLive) {
      return NextResponse.json({
        success: false,
        isLive: false,
        confidence: livenessResult.confidence,
        failureReasons: livenessResult.failureReasons,
        message: 'Liveness check failed. Please ensure you are a real person.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      isLive: true,
      confidence: livenessResult.confidence,
      challengeType,
      message: 'Liveness check passed successfully'
    })

  } catch (error) {
    console.error('Liveness check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/face/quality-check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateFaceQuality } from '@/lib/face-recognition'

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Validate face quality
    const qualityResult = await validateFaceQuality(imageBuffer)

    return NextResponse.json({
      success: true,
      quality: qualityResult,
      isValid: qualityResult.isValid,
      score: qualityResult.overallScore,
      issues: qualityResult.issues,
      suggestions: qualityResult.suggestions
    })

  } catch (error) {
    console.error('Face quality check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}