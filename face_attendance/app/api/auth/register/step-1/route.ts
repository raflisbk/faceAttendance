// app/api/auth/register/step-1/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerStep1Schema } from '@/lib/validations'
import { hash } from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '@/lib/redis'
import { sendVerificationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = registerStep1Schema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Generate registration session ID
    const registrationId = uuidv4()

    // Store registration data in Redis (24 hour expiry)
    const registrationData = {
      step: 1,
      data: {
        ...validatedData,
        password: hashedPassword
      },
      createdAt: new Date().toISOString()
    }

    await redis.setex(`registration:${registrationId}`, 86400, JSON.stringify(registrationData))

    // Generate email verification token
    const emailVerificationToken = uuidv4()
    await redis.setex(`email_verification:${emailVerificationToken}`, 3600, validatedData.email)

    // Send verification email
    await sendVerificationEmail(validatedData.email, emailVerificationToken)

    return NextResponse.json({
      success: true,
      registrationId,
      message: 'Step 1 completed. Check your email for verification.',
      nextStep: 2
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration step 1 error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}