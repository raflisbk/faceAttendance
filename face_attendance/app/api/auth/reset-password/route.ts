// app/api/auth/reset-password/route.ts
import { NextRequest } from 'next/server'
import { passwordResetSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { handleApiError, createSuccessResponse, AppError } from '@/lib/api-error-handler'
import { validateRequestBody } from '@/lib/api-validation'

export async function POST(request: NextRequest) {
  try {
    const validatedData = await validateRequestBody(request, passwordResetSchema)

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

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: {
        id: true,
        email: true,
        status: true,
        password: true
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

    // Check if the new password is different from the current one
    if (user.password) {
      const isSamePassword = await bcrypt.compare(validatedData.password, user.password)
      if (isSamePassword) {
        throw new AppError('New password must be different from the current password', 'SAME_PASSWORD', 400)
      }
    }

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds)

    // Update the user's password and remove the reset token
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      })

      // Remove the used token
      await tx.verificationToken.delete({
        where: { token: hashedToken }
      })

      // Invalidate all existing sessions for this user (force re-login)
      await tx.session.deleteMany({
        where: { userId: user.id }
      })

      // Log the password reset for security monitoring
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          resource: 'AUTH',
          details: {
            email: user.email,
            ipAddress: request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            sessionInvalidated: true
          },
          ipAddress: request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    })

    return createSuccessResponse(
      { message: 'Password has been reset successfully' },
      'Password reset completed'
    )

  } catch (error) {
    return handleApiError(error)
  }
}