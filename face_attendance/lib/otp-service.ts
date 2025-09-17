// face_attendance/lib/otp-service.ts
import { randomUUID } from 'crypto'
import { EmailService } from './email-service'

export interface OTPEntry {
  id: string
  identifier: string // email or phone number
  code: string
  type: 'EMAIL' | 'SMS'
  purpose: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'TWO_FACTOR_AUTH'
  attempts: number
  maxAttempts: number
  expiresAt: Date
  createdAt: Date
  verifiedAt?: Date
  isUsed: boolean
}

export interface OTPConfig {
  length: number
  expiryMinutes: number
  maxAttempts: number
  resendCooldownMinutes: number
  alphanumeric: boolean
}

export class OTPService {
  private static instance: OTPService
  private otpStore = new Map<string, OTPEntry>()
  private resendCooldowns = new Map<string, Date>()
  private cleanupInterval: NodeJS.Timeout | null = null

  // Default configurations for different purposes
  private configs: Record<string, OTPConfig> = {
    EMAIL_VERIFICATION: {
      length: 6,
      expiryMinutes: 30,
      maxAttempts: 5,
      resendCooldownMinutes: 2,
      alphanumeric: false
    },
    PHONE_VERIFICATION: {
      length: 6,
      expiryMinutes: 10,
      maxAttempts: 3,
      resendCooldownMinutes: 1,
      alphanumeric: false
    },
    PASSWORD_RESET: {
      length: 8,
      expiryMinutes: 15,
      maxAttempts: 3,
      resendCooldownMinutes: 5,
      alphanumeric: true
    },
    TWO_FACTOR_AUTH: {
      length: 6,
      expiryMinutes: 5,
      maxAttempts: 3,
      resendCooldownMinutes: 1,
      alphanumeric: false
    }
  }

  private constructor() {
    this.startCleanupProcess()
  }

  static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService()
    }
    return OTPService.instance
  }

  /**
   * Generate and send OTP
   */
  async generateOTP(
    identifier: string,
    type: 'EMAIL' | 'SMS',
    purpose: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'TWO_FACTOR_AUTH',
    userData?: {
      name?: string
      userId?: string
    }
  ): Promise<{
    success: boolean
    otpId: string
    message: string
    expiresAt: Date
    canResendAt?: Date
  }> {
    // Check resend cooldown
    const cooldownKey = `${identifier}-${purpose}`
    const existingCooldown = this.resendCooldowns.get(cooldownKey)

    if (existingCooldown && existingCooldown > new Date()) {
      return {
        success: false,
        otpId: '',
        message: `Please wait before requesting another OTP. You can resend after ${this.formatTimeRemaining(existingCooldown)}`,
        expiresAt: new Date(),
        canResendAt: existingCooldown
      }
    }

    // Invalidate any existing OTP for this identifier and purpose
    this.invalidateExistingOTP(identifier, purpose)

    // Get configuration for this purpose
    const config = this.configs[purpose]
    if (!config) {
      return {
        success: false,
        otpId: '',
        message: 'Invalid OTP purpose configuration',
        expiresAt: new Date()
      }
    }
    
    // Generate OTP code
    const code = this.generateOTPCode(config.length, config.alphanumeric)
    
    // Create OTP entry
    const otpEntry: OTPEntry = {
      id: randomUUID(),
      identifier,
      code,
      type,
      purpose,
      attempts: 0,
      maxAttempts: config.maxAttempts,
      expiresAt: new Date(Date.now() + config.expiryMinutes * 60 * 1000),
      createdAt: new Date(),
      isUsed: false
    }

    // Store OTP
    this.otpStore.set(otpEntry.id, otpEntry)

    // Set resend cooldown
    const newCooldownUntil = new Date(Date.now() + config.resendCooldownMinutes * 60 * 1000)
    this.resendCooldowns.set(cooldownKey, newCooldownUntil)

    // Send OTP
    try {
      if (type === 'EMAIL') {
        await this.sendEmailOTP(identifier, code, purpose, userData, config.expiryMinutes)
      } else {
        await this.sendSMSOTP(identifier, code, purpose, userData, config.expiryMinutes)
      }

      return {
        success: true,
        otpId: otpEntry.id,
        message: `OTP sent successfully to ${this.maskIdentifier(identifier)}`,
        expiresAt: otpEntry.expiresAt,
        canResendAt: newCooldownUntil
      }
    } catch (error) {
      // Remove OTP from store if sending failed
      this.otpStore.delete(otpEntry.id)
      
      return {
        success: false,
        otpId: '',
        message: 'Failed to send OTP. Please try again.',
        expiresAt: new Date()
      }
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    otpId: string,
    code: string,
    identifier?: string
  ): Promise<{
    success: boolean
    message: string
    purpose?: string
    attemptsRemaining?: number
  }> {
    const otpEntry = this.otpStore.get(otpId)
    
    if (!otpEntry) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      }
    }

    // Check if OTP is already used
    if (otpEntry.isUsed) {
      return {
        success: false,
        message: 'OTP has already been used'
      }
    }

    // Check if OTP is expired
    if (new Date() > otpEntry.expiresAt) {
      this.otpStore.delete(otpId)
      return {
        success: false,
        message: 'OTP has expired'
      }
    }

    // Check if identifier matches (optional additional security)
    if (identifier && otpEntry.identifier !== identifier) {
      return {
        success: false,
        message: 'Invalid OTP request'
      }
    }

    // Increment attempt count
    otpEntry.attempts++

    // Check if max attempts exceeded
    if (otpEntry.attempts > otpEntry.maxAttempts) {
      this.otpStore.delete(otpId)
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      }
    }

    // Verify code (timing-safe comparison)
    const isValid = this.timingSafeEqual(code.toUpperCase(), otpEntry.code.toUpperCase())
    
    if (isValid) {
      // Mark as used and verified
      otpEntry.isUsed = true
      otpEntry.verifiedAt = new Date()
      
      return {
        success: true,
        message: 'OTP verified successfully',
        purpose: otpEntry.purpose
      }
    } else {
      const attemptsRemaining = otpEntry.maxAttempts - otpEntry.attempts
      
      return {
        success: false,
        message: `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining
      }
    }
  }

  /**
   * Check if OTP can be resent
   */
  canResendOTP(identifier: string, purpose: string): {
    canResend: boolean
    cooldownUntil?: Date
    timeRemaining?: string
  } {
    const cooldownKey = `${identifier}-${purpose}`
    const cooldownUntil = this.resendCooldowns.get(cooldownKey)
    
    if (!cooldownUntil || cooldownUntil <= new Date()) {
      return { canResend: true }
    }
    
    return {
      canResend: false,
      cooldownUntil,
      timeRemaining: this.formatTimeRemaining(cooldownUntil)
    }
  }

  /**
   * Get OTP status
   */
  getOTPStatus(otpId: string): {
    exists: boolean
    isValid?: boolean
    isUsed?: boolean
    attemptsRemaining?: number
    expiresAt?: Date
    purpose?: string
  } {
    const otpEntry = this.otpStore.get(otpId)
    
    if (!otpEntry) {
      return { exists: false }
    }
    
    const isValid = new Date() <= otpEntry.expiresAt && !otpEntry.isUsed
    const attemptsRemaining = otpEntry.maxAttempts - otpEntry.attempts
    
    return {
      exists: true,
      isValid,
      isUsed: otpEntry.isUsed,
      attemptsRemaining,
      expiresAt: otpEntry.expiresAt,
      purpose: otpEntry.purpose
    }
  }

  /**
   * Invalidate OTP
   */
  invalidateOTP(otpId: string): boolean {
    return this.otpStore.delete(otpId)
  }

  /**
   * Generate OTP code
   */
  private generateOTPCode(length: number, alphanumeric: boolean): string {
    const numericChars = '0123456789'
    const alphaChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const chars = alphanumeric ? numericChars + alphaChars : numericChars
    
    let code = ''
    const randomBytes = globalThis.crypto?.getRandomValues(new Uint8Array(length))

    if (!randomBytes) {
      // Fallback for Node.js environment
      const { randomBytes: nodeRandomBytes } = require('crypto')
      const bytes = nodeRandomBytes(length)
      for (let i = 0; i < length; i++) {
        code += chars[bytes[i] % chars.length]
      }
      return code
    }
    
    for (let i = 0; i < length; i++) {
      const byte = randomBytes[i]
      if (byte !== undefined) {
        code += chars[byte % chars.length]
      }
    }
    
    return code
  }

  /**
   * Send OTP via email
   */
  private async sendEmailOTP(
    email: string,
    code: string,
    _purpose: string,
    userData?: { name?: string; userId?: string },
    expiryMinutes: number = 10
  ): Promise<void> {
    const emailService = EmailService.getInstance()
    
    const name = userData?.name || 'User'
    
    try {
      await emailService.sendOTPVerification(email, name, code, expiryMinutes)
    } catch (error) {
      console.error('Failed to send OTP email:', error)
      throw error
    }
  }

  /**
   * Send OTP via SMS (mock implementation)
   */
  private async sendSMSOTP(
    phone: string,
    code: string,
    _purpose: string,
    _userData?: { name?: string; userId?: string },
    expiryMinutes: number = 10
  ): Promise<void> {
    // Mock SMS sending - replace with actual SMS service
    // (Twilio, AWS SNS, etc.)
    
    const message = `Your verification code is: ${code}. This code expires in ${expiryMinutes} minutes. Do not share this code with anyone.`
    
    console.log(`📱 SMS sent to ${this.maskIdentifier(phone)}: ${message}`)
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, integrate with SMS service:
    // - Twilio
    // - AWS SNS
    // - Firebase Cloud Messaging
    // - Local SMS gateway
  }

  /**
   * Invalidate existing OTP for identifier and purpose
   */
  private invalidateExistingOTP(identifier: string, purpose: string): void {
    for (const [id, otpEntry] of this.otpStore.entries()) {
      if (otpEntry.identifier === identifier && otpEntry.purpose === purpose && !otpEntry.isUsed) {
        this.otpStore.delete(id)
      }
    }
  }

  /**
   * Mask identifier for privacy
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email
      const parts = identifier.split('@')
      const local = parts[0]
      const domain = parts[1]

      if (!local || !domain) {
        return '*'.repeat(identifier.length)
      }

      const maskedLocal = local.length > 2
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : '*'.repeat(local.length)
      return `${maskedLocal}@${domain}`
    } else {
      // Phone number
      if (identifier.length > 4) {
        const visible = identifier.slice(0, 2) + identifier.slice(-2)
        const masked = '*'.repeat(identifier.length - 4)
        return visible.slice(0, 2) + masked + visible.slice(2)
      }
      return '*'.repeat(identifier.length)
    }
  }

  /**
   * Format time remaining for cooldown
   */
  private formatTimeRemaining(endTime: Date): string {
    const now = new Date()
    const diff = endTime.getTime() - now.getTime()
    
    if (diff <= 0) return '0 seconds'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`
    }
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }

  /**
   * Start cleanup process for expired OTPs
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredOTPs()
    }, 60000) // Cleanup every minute
  }

  /**
   * Cleanup expired OTPs and cooldowns
   */
  private cleanupExpiredOTPs(): void {
    const now = new Date()
    
    // Cleanup expired OTPs
    for (const [id, otpEntry] of this.otpStore.entries()) {
      if (now > otpEntry.expiresAt || otpEntry.isUsed) {
        this.otpStore.delete(id)
      }
    }
    
    // Cleanup expired cooldowns
    for (const [key, expiry] of this.resendCooldowns.entries()) {
      if (now > expiry) {
        this.resendCooldowns.delete(key)
      }
    }
  }

  /**
   * Get OTP statistics
   */
  getStatistics(): {
    activeOTPs: number
    usedOTPs: number
    expiredOTPs: number
    activeCooldowns: number
    byPurpose: Record<string, number>
    byType: Record<string, number>
  } {
    const now = new Date()
    const stats = {
      activeOTPs: 0,
      usedOTPs: 0,
      expiredOTPs: 0,
      activeCooldowns: this.resendCooldowns.size,
      byPurpose: {} as Record<string, number>,
      byType: {} as Record<string, number>
    }
    
    for (const otpEntry of this.otpStore.values()) {
      // Count by status
      if (otpEntry.isUsed) {
        stats.usedOTPs++
      } else if (now > otpEntry.expiresAt) {
        stats.expiredOTPs++
      } else {
        stats.activeOTPs++
      }
      
      // Count by purpose
      stats.byPurpose[otpEntry.purpose] = (stats.byPurpose[otpEntry.purpose] || 0) + 1
      
      // Count by type
      stats.byType[otpEntry.type] = (stats.byType[otpEntry.type] || 0) + 1
    }
    
    return stats
  }

  /**
   * Update OTP configuration
   */
  updateConfig(purpose: string, config: Partial<OTPConfig>): void {
    if (this.configs[purpose]) {
      this.configs[purpose] = { ...this.configs[purpose], ...config }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(purpose: string): OTPConfig | undefined {
    return this.configs[purpose]
  }

  /**
   * Stop cleanup process
   */
  stopCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clear all OTPs and cooldowns (for testing/cleanup)
   */
  clearAll(): void {
    this.otpStore.clear()
    this.resendCooldowns.clear()
  }

  /**
   * Verify OTP by identifier and code (alternative method)
   */
  async verifyOTPByIdentifier(
    identifier: string,
    code: string,
    purpose: string
  ): Promise<{
    success: boolean
    message: string
    otpId?: string
    attemptsRemaining?: number
  }> {
    // Find active OTP for this identifier and purpose
    let targetOTP: [string, OTPEntry] | undefined
    
    for (const [id, otpEntry] of this.otpStore.entries()) {
      if (otpEntry.identifier === identifier && 
          otpEntry.purpose === purpose && 
          !otpEntry.isUsed && 
          new Date() <= otpEntry.expiresAt) {
        targetOTP = [id, otpEntry]
        break
      }
    }
    
    if (!targetOTP) {
      return {
        success: false,
        message: 'No valid OTP found for this request'
      }
    }
    
    const [otpId] = targetOTP
    const result = await this.verifyOTP(otpId, code, identifier)
    
    return {
      ...result,
      ...(result.success && { otpId })
    }
  }
}