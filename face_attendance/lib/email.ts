/**
 * Email service utilities for face attendance system
 */

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>
}

/**
 * Resend email provider for production
 */
class ResendEmailProvider implements EmailProvider {
  private resend: any

  constructor() {
    // Dynamic import Resend to avoid errors if not installed
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend')
        this.resend = new Resend(process.env.RESEND_API_KEY)
      } catch (error) {
        console.warn('Resend not available, falling back to mock provider')
        this.resend = null
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.resend) {
      console.log('📧 Resend not configured, falling back to console log:')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      return {
        success: true,
        messageId: `fallback-${Date.now()}`
      }
    }

    try {
      const fromEmail = process.env.FROM_EMAIL || 'noreply@localhost.com'

      const data = await this.resend.emails.send({
        from: fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      })

      return {
        success: true,
        messageId: data.id
      }
    } catch (error) {
      console.error('Resend email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }
}

/**
 * Mock email provider for development
 */
class MockEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('📧 Mock Email Sent:')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Content:', options.text || options.html?.substring(0, 100) + '...')

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2)}`
    }
  }
}

/**
 * Email service class
 */
class EmailService {
  private provider: EmailProvider

  constructor(provider: EmailProvider) {
    this.provider = provider
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      return await this.provider.sendEmail(options)
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const template = createVerificationEmailTemplate(verificationToken)

    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    return result.success
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const template = createPasswordResetEmailTemplate(resetToken)

    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    return result.success
  }

  async sendApprovalEmail(email: string, userName: string): Promise<boolean> {
    const template = createApprovalEmailTemplate(userName)

    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    return result.success
  }

  async sendRejectionEmail(email: string, userName: string, reason?: string): Promise<boolean> {
    const template = createRejectionEmailTemplate(userName, reason)

    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    return result.success
  }

  async sendAttendanceNotification(
    email: string,
    studentName: string,
    className: string,
    status: string,
    date: Date
  ): Promise<boolean> {
    const template = createAttendanceNotificationTemplate(studentName, className, status, date)

    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    return result.success
  }
}

/**
 * Create email templates
 */
function createVerificationEmailTemplate(verificationToken: string): EmailTemplate {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`

  return {
    subject: 'Verify Your Email - Face Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Thank you for registering with the Face Attendance System. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          This link will expire in 24 hours. If you didn't request this verification, please ignore this email.
        </p>
      </div>
    `,
    text: `
      Email Verification - Face Attendance System

      Thank you for registering with the Face Attendance System. Please visit the following link to verify your email address:

      ${verificationUrl}

      This link will expire in 24 hours. If you didn't request this verification, please ignore this email.
    `
  }
}

function createPasswordResetEmailTemplate(resetToken: string): EmailTemplate {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  return {
    subject: 'Password Reset - Face Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>You requested a password reset for your Face Attendance System account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
        </p>
      </div>
    `,
    text: `
      Password Reset - Face Attendance System

      You requested a password reset for your Face Attendance System account. Please visit the following link to reset your password:

      ${resetUrl}

      This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
    `
  }
}

function createApprovalEmailTemplate(userName: string): EmailTemplate {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

  return {
    subject: 'Account Approved - Face Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Account Approved!</h2>
        <p>Dear ${userName},</p>
        <p>Great news! Your Face Attendance System account has been approved and is now active.</p>
        <p>You can now log in and start using the system:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login Now
          </a>
        </div>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Welcome to the Face Attendance System!</p>
      </div>
    `,
    text: `
      Account Approved - Face Attendance System

      Dear ${userName},

      Great news! Your Face Attendance System account has been approved and is now active.

      You can now log in at: ${loginUrl}

      If you have any questions or need assistance, please don't hesitate to contact our support team.

      Welcome to the Face Attendance System!
    `
  }
}

function createRejectionEmailTemplate(userName: string, reason?: string): EmailTemplate {
  return {
    subject: 'Account Application Update - Face Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Account Application Update</h2>
        <p>Dear ${userName},</p>
        <p>Thank you for your interest in the Face Attendance System. After reviewing your application, we regret to inform you that we cannot approve your account at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this was an error or if you have additional information to provide, please contact our support team for assistance.</p>
        <p>Thank you for your understanding.</p>
      </div>
    `,
    text: `
      Account Application Update - Face Attendance System

      Dear ${userName},

      Thank you for your interest in the Face Attendance System. After reviewing your application, we regret to inform you that we cannot approve your account at this time.

      ${reason ? `Reason: ${reason}` : ''}

      If you believe this was an error or if you have additional information to provide, please contact our support team for assistance.

      Thank you for your understanding.
    `
  }
}

function createAttendanceNotificationTemplate(
  studentName: string,
  className: string,
  status: string,
  date: Date
): EmailTemplate {
  const statusColors: Record<string, string> = {
    PRESENT: '#28a745',
    LATE: '#ffc107',
    ABSENT: '#dc3545',
    EXCUSED: '#17a2b8'
  }

  const statusColor = statusColors[status] || '#6c757d'
  const formattedDate = date.toLocaleDateString()
  const formattedTime = date.toLocaleTimeString()

  return {
    subject: `Attendance Update: ${className} - ${formattedDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Attendance Update</h2>
        <p>Dear ${studentName},</p>
        <p>This is a notification regarding your attendance for <strong>${className}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Class:</strong> ${className}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
        </div>
        <p>If you have any questions about this attendance record, please contact your instructor or the academic office.</p>
      </div>
    `,
    text: `
      Attendance Update - Face Attendance System

      Dear ${studentName},

      This is a notification regarding your attendance for ${className}.

      Class: ${className}
      Date: ${formattedDate}
      Time: ${formattedTime}
      Status: ${status}

      If you have any questions about this attendance record, please contact your instructor or the academic office.
    `
  }
}

// Create default email service instance
const emailProvider = process.env.NODE_ENV === 'production' || process.env.RESEND_API_KEY
  ? new ResendEmailProvider()
  : new MockEmailProvider()

const emailService = new EmailService(emailProvider)

// Export convenience functions
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  return emailService.sendVerificationEmail(email, token)
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  return emailService.sendPasswordResetEmail(email, token)
}

export async function sendApprovalEmail(email: string, userName: string): Promise<boolean> {
  return emailService.sendApprovalEmail(email, userName)
}

export async function sendRejectionEmail(email: string, userName: string, reason?: string): Promise<boolean> {
  return emailService.sendRejectionEmail(email, userName, reason)
}

export async function sendAttendanceNotification(
  email: string,
  studentName: string,
  className: string,
  status: string,
  date: Date
): Promise<boolean> {
  return emailService.sendAttendanceNotification(email, studentName, className, status, date)
}

export { EmailService, MockEmailProvider, ResendEmailProvider }
export type { EmailOptions, EmailTemplate, EmailProvider }