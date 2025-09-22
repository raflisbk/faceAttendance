// app/api/auth/verify-reset-token/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { handleApiError, createSuccessResponse, AppError } from '@/lib/api-error-handler'
import { validateRequestBody } from '@/lib/api-validation'

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Reset token is required')
})

export async function POST(request: NextRequest) {
  try {
    const validatedData = await validateRequestBody(request, verifyTokenSchema)

    // Hash the provided token to match what's stored in the database
    const hashedToken = crypto.createHash('sha256').update(validatedData.token).digest('hex')

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken }
    })

    if (!verificationToken) {
      throw new AppError('Invalid or expired reset token', 'INVALID_TOKEN', 400)
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { token: hashedToken }
      })

      throw new AppError('Reset token has expired', 'TOKEN_EXPIRED', 400)
    }

    // Verify that the user still exists and is eligible for password reset
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: {
        id: true,
        email: true,
        status: true
      }
    })

    if (!user) {
      // Clean up orphaned token
      await prisma.verificationToken.delete({
        where: { token: hashedToken }
      })

      throw new AppError('User account not found', 'USER_NOT_FOUND', 404)
    }

    // Check if account is still eligible for password reset
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      throw new AppError('Account is not eligible for password reset', 'ACCOUNT_INELIGIBLE', 403)
    }

    // Token is valid
    return createSuccessResponse(
      {
        valid: true,
        email: user.email
      },
      'Reset token is valid'
    )

  } catch (error) {
    return handleApiError(error)
  }
}