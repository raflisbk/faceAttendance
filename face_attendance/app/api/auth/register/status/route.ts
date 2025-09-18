// app/api/auth/register/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registrationId = searchParams.get('registrationId')

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Get registration data from Redis
    const registrationDataStr = await redis.get(`registration:${registrationId}`)
    if (!registrationDataStr) {
      return NextResponse.json(
        { error: 'Registration session not found or expired' },
        { status: 404 }
      )
    }

    const registrationData = JSON.parse(registrationDataStr)

    // Calculate completion percentage
    const totalSteps = 3
    const completedSteps = registrationData.step
    const completionPercentage = (completedSteps / totalSteps) * 100

    return NextResponse.json({
      success: true,
      data: {
        registrationId,
        currentStep: registrationData.step,
        totalSteps,
        completionPercentage,
        status: registrationData.step >= 3 ? 'READY_TO_COMPLETE' : 'IN_PROGRESS',
        steps: {
          basicInfo: registrationData.step >= 1,
          documentUpload: registrationData.step >= 2,
          faceEnrollment: registrationData.step >= 3
        },
        createdAt: registrationData.createdAt,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    })

  } catch (error) {
    console.error('Registration status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
