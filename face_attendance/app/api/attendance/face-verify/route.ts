// app/api/attendance/face-verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { verifyFaceRecognition } from '@/lib/face-recognition'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { faceImageData, threshold = 0.6 } = await request.json()

    if (!faceImageData) {
      return NextResponse.json(
        { error: 'Face image data is required' },
        { status: 400 }
      )
    }

    // Get user's face profile
    const faceProfile = await prisma.faceProfile.findFirst({
      where: {
        userId: user.id
      }
    })

    if (!faceProfile) {
      return NextResponse.json(
        { error: 'No approved face profile found' },
        { status: 404 }
      )
    }

    // Perform face verification
    const descriptors = Array.isArray(faceProfile.faceDescriptors)
      ? faceProfile.faceDescriptors as number[]
      : []
    const verificationResult = await verifyFaceRecognition(
      faceImageData,
      descriptors
    )

    // Log verification attempt
    await prisma.faceQualityLog.create({
      data: {
        userId: user.id,
        qualityScores: {
          confidence: verificationResult.confidence,
          threshold
        },
        validationResults: {
          isMatch: verificationResult.isMatch,
          timestamp: new Date().toISOString()
        },
        passed: verificationResult.isMatch
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        isMatch: verificationResult.isMatch,
        confidence: verificationResult.confidence,
        threshold,
        profileQuality: faceProfile.qualityScore,
        timestamp: new Date().toISOString()
      },
      message: verificationResult.isMatch 
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