// lib/otp.ts
// import crypto from 'crypto'
import { prisma } from './prisma'

export interface OTPConfig {
  length: number
  expiresInMinutes: number
  type: 'NUMERIC' | 'ALPHANUMERIC' | 'ALPHA'
}

export interface OTPData {
  id: string
  code: string
  email: string
  purpose: string
  expiresAt: Date
  attempts: number
  isUsed: boolean
  createdAt: Date
}

export class OTPService {
  private static readonly DEFAULT_CONFIG: OTPConfig = {
    length: 6,
    expiresInMinutes: 15,
    type: 'NUMERIC'
  }

  private static readonly MAX_ATTEMPTS = 3
  private static readonly RATE_LIMIT_MINUTES = 1 // Minimum interval between OTP requests

  /**
   * Generate OTP code based on configuration
   */
  static generateOTPCode(config: Partial<OTPConfig> = {}): string {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }

    let characters = ''
    switch (finalConfig.type) {
      case 'NUMERIC':
        characters = '0123456789'
        break
      case 'ALPHANUMERIC':
        characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        break
      case 'ALPHA':
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        break
    }

    let result = ''
    for (let i = 0; i < finalConfig.length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result
  }

  /**
   * Create and store OTP in database
   */
  static async createOTP(
    email: string,
    purpose: string = 'EMAIL_VERIFICATION',
    config: Partial<OTPConfig> = {}
  ): Promise<{ success: boolean; otpCode?: string; error?: string; remainingTime?: number }> {
    try {
      // Check rate limiting
      const recentOTP = await prisma.oTP.findFirst({
        where: {
          email,
          purpose,
          createdAt: {
            gte: new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentOTP) {
        const remainingTime = this.RATE_LIMIT_MINUTES * 60 -
          Math.floor((Date.now() - recentOTP.createdAt.getTime()) / 1000)

        return {
          success: false,
          error: `Please wait ${remainingTime} seconds before requesting a new OTP`,
          remainingTime
        }
      }

      // Invalidate existing unused OTPs for this email and purpose
      await prisma.oTP.updateMany({
        where: {
          email,
          purpose,
          isUsed: false
        },
        data: {
          isUsed: true
        }
      })

      // Generate new OTP
      const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
      const otpCode = this.generateOTPCode(finalConfig)
      const expiresAt = new Date(Date.now() + finalConfig.expiresInMinutes * 60 * 1000)

      // Store in database
      await prisma.oTP.create({
        data: {
          code: otpCode,
          email,
          purpose,
          expiresAt,
          attempts: 0,
          isUsed: false
        }
      })

      return {
        success: true,
        otpCode
      }

    } catch (error) {
      console.error('OTP creation error:', error)
      return {
        success: false,
        error: 'Failed to generate OTP'
      }
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(
    email: string,
    code: string,
    purpose: string = 'EMAIL_VERIFICATION'
  ): Promise<{ success: boolean; error?: string; otpData?: OTPData }> {
    try {
      // Find the OTP
      const otp = await prisma.oTP.findFirst({
        where: {
          email,
          purpose,
          isUsed: false,
          expiresAt: {
            gte: new Date()
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!otp) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        }
      }

      // Check attempts limit
      if (otp.attempts >= this.MAX_ATTEMPTS) {
        await prisma.oTP.update({
          where: { id: otp.id },
          data: { isUsed: true }
        })

        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        }
      }

      // Verify code
      if (otp.code !== code.toUpperCase()) {
        // Increment attempts
        await prisma.oTP.update({
          where: { id: otp.id },
          data: { attempts: otp.attempts + 1 }
        })

        const remainingAttempts = this.MAX_ATTEMPTS - (otp.attempts + 1)
        return {
          success: false,
          error: `Invalid OTP. ${remainingAttempts} attempts remaining`
        }
      }

      // Mark as used
      await prisma.oTP.update({
        where: { id: otp.id },
        data: { isUsed: true }
      })

      return {
        success: true,
        otpData: otp as OTPData
      }

    } catch (error) {
      console.error('OTP verification error:', error)
      return {
        success: false,
        error: 'Failed to verify OTP'
      }
    }
  }

  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await prisma.oTP.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isUsed: true },
            { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // 24 hours old
          ]
        }
      })

      console.log(`Cleaned up ${result.count} expired OTPs`)
      return result.count
    } catch (error) {
      console.error('OTP cleanup error:', error)
      return 0
    }
  }

  /**
   * Get OTP status for email
   */
  static async getOTPStatus(
    email: string,
    purpose: string = 'EMAIL_VERIFICATION'
  ): Promise<{
    hasActive: boolean
    attemptsUsed?: number
    maxAttempts?: number
    expiresAt?: Date
    canRequestNew?: boolean
    nextRequestIn?: number
  }> {
    try {
      const activeOTP = await prisma.oTP.findFirst({
        where: {
          email,
          purpose,
          isUsed: false,
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      })

      const recentOTP = await prisma.oTP.findFirst({
        where: {
          email,
          purpose,
          createdAt: {
            gte: new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const canRequestNew = !recentOTP
      const nextRequestIn = recentOTP ?
        this.RATE_LIMIT_MINUTES * 60 - Math.floor((Date.now() - recentOTP.createdAt.getTime()) / 1000) : 0

      return {
        hasActive: !!activeOTP,
        attemptsUsed: activeOTP?.attempts || 0,
        maxAttempts: this.MAX_ATTEMPTS,
        expiresAt: activeOTP?.expiresAt || undefined,
        canRequestNew,
        nextRequestIn: Math.max(0, nextRequestIn)
      }
    } catch (error) {
      console.error('OTP status error:', error)
      return {
        hasActive: false,
        canRequestNew: true,
        nextRequestIn: 0
      }
    }
  }

  /**
   * Resend OTP (create new one)
   */
  static async resendOTP(
    email: string,
    purpose: string = 'EMAIL_VERIFICATION',
    config: Partial<OTPConfig> = {}
  ): Promise<{ success: boolean; otpCode?: string; error?: string }> {
    // Same as createOTP but with explicit resend context
    return this.createOTP(email, purpose, config)
  }
}

// Utility functions for common OTP purposes
export const OTPPurposes = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  TWO_FACTOR_AUTH: 'TWO_FACTOR_AUTH',
  ACCOUNT_RECOVERY: 'ACCOUNT_RECOVERY'
} as const

export type OTPPurpose = typeof OTPPurposes[keyof typeof OTPPurposes]

// Export default instance
export default OTPService