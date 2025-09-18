// app/api/auth/register/verify-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    // Get stored OTP from Redis
    const storedOTP = await redis.get(`phone_verification:${phoneNumber}`)
    if (!storedOTP) {
      return NextResponse.json(
        { error: 'OTP expired or not found' },
        { status: 400 }
      )
    }

    if (storedOTP !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      )
    }

    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: { phoneNumber }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Mark phone as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date()
      }
    })

    // Clean up OTP
    await redis.del(`phone_verification:${phoneNumber}`)

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully'
    })

  } catch (error) {
    console.error('Phone verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Send OTP endpoint
export async function PUT(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in Redis with 5 minute expiry
    await redis.setex(`phone_verification:${phoneNumber}`, 300, otp)

    // In production, send OTP via SMS service
    // await sendSMS(phoneNumber, `Your verification code is: ${otp}`)
    
    // For development, log the OTP
    console.log(`OTP for ${phoneNumber}: ${otp}`)

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully'
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}