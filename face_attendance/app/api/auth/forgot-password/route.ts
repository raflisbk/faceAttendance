// app/api/auth/forgot-password/route.ts
import { NextRequest } from 'next/server'
import { passwordResetRequestSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { handleApiError, createSuccessResponse, AppError } from '@/lib/api-error-handler'
import { validateRequestBody } from '@/lib/api-validation'

export async function POST(request: NextRequest) {
  try {
    const validatedData = await validateRequestBody(request, passwordResetRequestSchema)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    })

    // Always return success to prevent email enumeration attacks
    // Don't reveal whether the email exists or not
    if (!user) {
      // Return success but don't actually send an email
      return createSuccessResponse(
        { message: 'If an account with this email exists, a password reset link has been sent.' },
        'Password reset email sent'
      )
    }

    // Check if account is active
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      // Return success but don't send email for suspended/rejected accounts
      return createSuccessResponse(
        { message: 'If an account with this email exists, a password reset link has been sent.' },
        'Password reset email sent'
      )
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store the hashed token in the database
    // First, clean up any existing tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: user.email
      }
    })

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: hashedToken,
        expires: expiresAt
      }
    })

    // Send password reset email
    try {
      const emailSent = await sendPasswordResetEmail(user.email, resetToken)

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email)
        // Don't throw error, still return success to prevent enumeration
      }
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      // Don't throw error, still return success to prevent enumeration
    }

    // Log the password reset request for security monitoring
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'AUTH',
        details: {
          email: user.email,
          ipAddress: request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        ipAddress: request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return createSuccessResponse(
      { message: 'If an account with this email exists, a password reset link has been sent.' },
      'Password reset email sent'
    )

  } catch (error) {
    return handleApiError(error)
  }
}