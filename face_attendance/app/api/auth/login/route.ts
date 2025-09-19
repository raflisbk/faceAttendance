// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        registrationStep: true,
        avatar: true
      }
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Check if account is active
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Account has been suspended. Please contact administrator.'
        },
        { status: 403 }
      )
    }

    if (user.status === 'REJECTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Account registration was rejected. Please contact administrator.'
        },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: validatedData.rememberMe ? '30d' : '24h'
      }
    )

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      registrationStep: user.registrationStep,
      avatar: user.avatar
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Set HTTP-only cookie if remember me is selected
    const response = NextResponse.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: 'Login successful'
    })

    if (validatedData.rememberMe) {
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      })
    }

    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}