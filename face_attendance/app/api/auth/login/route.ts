// app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { handleApiError, createSuccessResponse, createErrorResponse, AppError } from '@/lib/api-error-handler'
import { validateRequestBody } from '@/lib/api-validation'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export async function POST(request: NextRequest) {
  try {
    const validatedData = await validateRequestBody(request, loginSchema)

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
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    // Check if account is active
    if (user.status === 'SUSPENDED') {
      throw new AppError(
        'Account has been suspended. Please contact administrator.',
        'ACCOUNT_SUSPENDED',
        403
      )
    }

    if (user.status === 'REJECTED') {
      throw new AppError(
        'Account registration was rejected. Please contact administrator.',
        'ACCOUNT_REJECTED',
        403
      )
    }

    // Verify password
    if (!user.password) {
      throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401)
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
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
        lastLogin: new Date()
      }
    })

    // Set HTTP-only cookie if remember me is selected
    const response = createSuccessResponse(
      {
        user: userData,
        token
      },
      'Login successful'
    )

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
    return handleApiError(error)
  }
}