// face_attendance/lib/email-service.ts

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
}

export interface EmailData {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
  template?: string
  variables?: Record<string, any>
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
  disposition?: 'attachment' | 'inline'
  cid?: string
}

export interface EmailQueue {
  id: string
  emailData: EmailData
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  maxAttempts: number
  scheduledAt?: Date
  sentAt?: Date
  failedAt?: Date
  error?: string
  createdAt: Date
}

export class EmailService {
  private static instance: EmailService
  private emailQueue: EmailQueue[] = []
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  // Email templates
  private templates: Map<string, EmailTemplate> = new Map([
    ['welcome', {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to Face Attendance System',
      htmlContent: `
        <h1>Welcome {{name}}!</h1>
        <p>Thank you for registering with the Face Attendance System.</p>
        <p>Your account has been created successfully. Please complete your registration by verifying your email.</p>
        <a href="{{verificationLink}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you have any questions, please contact our support team.</p>
      `,
      textContent: `
        Welcome {{name}}!
        Thank you for registering with the Face Attendance System.
        Your account has been created successfully. Please complete your registration by verifying your email.
        Verification link: {{verificationLink}}
        If you have any questions, please contact our support team.
      `,
      variables: ['name', 'verificationLink']
    }],
    ['email-verification', {
      id: 'email-verification',
      name: 'Email Verification',
      subject: 'Verify Your Email Address',
      htmlContent: `
        <h1>Verify Your Email</h1>
        <p>Hi {{name}},</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="{{verificationLink}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
      textContent: `
        Verify Your Email
        Hi {{name}},
        Please click the link below to verify your email address:
        {{verificationLink}}
        This link will expire in 24 hours.
        If you didn't create this account, please ignore this email.
      `,
      variables: ['name', 'verificationLink']
    }],
    ['password-reset', {
      id: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset Your Password',
      htmlContent: `
        <h1>Password Reset Request</h1>
        <p>Hi {{name}},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <a href="{{resetLink}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      textContent: `
        Password Reset Request
        Hi {{name}},
        You requested to reset your password. Click the link below to create a new password:
        {{resetLink}}
        This link will expire in 1 hour.
        If you didn't request this, please ignore this email.
      `,
      variables: ['name', 'resetLink']
    }],
    ['account-approved', {
      id: 'account-approved',
      name: 'Account Approved',
      subject: 'Your Account Has Been Approved',
      htmlContent: `
        <h1>Account Approved!</h1>
        <p>Hi {{name}},</p>
        <p>Great news! Your account has been approved and you can now access the Face Attendance System.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Role: {{role}}</li>
          <li>Student/Staff ID: {{userId}}</li>
        </ul>
        <a href="{{loginLink}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
        <p>You can now start using the system for attendance tracking.</p>
      `,
      textContent: `
        Account Approved!
        Hi {{name}},
        Great news! Your account has been approved and you can now access the Face Attendance System.
        Account Details:
        - Email: {{email}}
        - Role: {{role}}
        - Student/Staff ID: {{userId}}
        Login link: {{loginLink}}
        You can now start using the system for attendance tracking.
      `,
      variables: ['name', 'email', 'role', 'userId', 'loginLink']
    }],
    ['account-rejected', {
      id: 'account-rejected',
      name: 'Account Rejected',
      subject: 'Account Application Update',
      htmlContent: `
        <h1>Account Application Update</h1>
        <p>Hi {{name}},</p>
        <p>Thank you for your interest in the Face Attendance System.</p>
        <p>Unfortunately, we cannot approve your account at this time.</p>
        <p><strong>Reason:</strong> {{reason}}</p>
        <p>If you believe this is an error or have questions, please contact our support team at {{supportEmail}}.</p>
        <p>You may reapply after addressing the mentioned issues.</p>
      `,
      textContent: `
        Account Application Update
        Hi {{name}},
        Thank you for your interest in the Face Attendance System.
        Unfortunately, we cannot approve your account at this time.
        Reason: {{reason}}
        If you believe this is an error or have questions, please contact our support team at {{supportEmail}}.
        You may reapply after addressing the mentioned issues.
      `,
      variables: ['name', 'reason', 'supportEmail']
    }],
    ['attendance-reminder', {
      id: 'attendance-reminder',
      name: 'Attendance Reminder',
      subject: 'Class Starting Soon - {{className}}',
      htmlContent: `
        <h1>Class Reminder</h1>
        <p>Hi {{studentName}},</p>
        <p>This is a reminder that your class is starting soon:</p>
        <p><strong>Class:</strong> {{className}} ({{classCode}})</p>
        <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Lecturer:</strong> {{lecturerName}}</p>
        <p>Please ensure you arrive on time and are ready to check in using the face recognition system.</p>
        <a href="{{checkInLink}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Check In Now</a>
      `,
      textContent: `
        Class Reminder
        Hi {{studentName}},
        This is a reminder that your class is starting soon:
        Class: {{className}} ({{classCode}})
        Time: {{startTime}} - {{endTime}}
        Location: {{location}}
        Lecturer: {{lecturerName}}
        Please ensure you arrive on time and are ready to check in using the face recognition system.
        Check in: {{checkInLink}}
      `,
      variables: ['studentName', 'className', 'classCode', 'startTime', 'endTime', 'location', 'lecturerName', 'checkInLink']
    }],
    ['otp-verification', {
      id: 'otp-verification',
      name: 'OTP Verification',
      subject: 'Your Verification Code',
      htmlContent: `
        <h1>Verification Code</h1>
        <p>Hi {{name}},</p>
        <p>Your verification code is:</p>
        <h2 style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; margin: 20px 0;">{{otpCode}}</h2>
        <p>This code will expire in {{expiryMinutes}} minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `,
      textContent: `
        Verification Code
        Hi {{name}},
        Your verification code is: {{otpCode}}
        This code will expire in {{expiryMinutes}} minutes.
        If you didn't request this code, please ignore this email.
      `,
      variables: ['name', 'otpCode', 'expiryMinutes']
    }]
  ])

  private constructor() {
    this.startQueueProcessor()
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    templateId: string,
    to: string | string[],
    variables: Record<string, any>,
    options: {
      priority?: 'low' | 'normal' | 'high'
      scheduledAt?: Date
      attachments?: EmailAttachment[]
    } = {}
  ): Promise<string> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Email template '${templateId}' not found`)
    }

    const html = this.interpolateTemplate(template.htmlContent, variables)
    const text = this.interpolateTemplate(template.textContent, variables)
    const subject = this.interpolateTemplate(template.subject, variables)

    const emailData: EmailData = {
      to,
      subject,
      html,
      text,
      template: templateId,
      variables,
      attachments: options.attachments
    }

    return this.queueEmail(emailData, options)
  }

  /**
   * Send plain email
   */
  async sendEmail(emailData: EmailData, options: {
    priority?: 'low' | 'normal' | 'high'
    scheduledAt?: Date
  } = {}): Promise<string> {
    return this.queueEmail(emailData, options)
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string, verificationLink: string): Promise<string> {
    return this.sendTemplateEmail('welcome', to, {
      name,
      verificationLink
    })
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(to: string, name: string, verificationLink: string): Promise<string> {
    return this.sendTemplateEmail('email-verification', to, {
      name,
      verificationLink
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, name: string, resetLink: string): Promise<string> {
    return this.sendTemplateEmail('password-reset', to, {
      name,
      resetLink
    })
  }

  /**
   * Send account approval notification
   */
  async sendAccountApproved(
    to: string,
    name: string,
    email: string,
    role: string,
    userId: string,
    loginLink: string
  ): Promise<string> {
    return this.sendTemplateEmail('account-approved', to, {
      name,
      email,
      role,
      userId,
      loginLink
    })
  }

  /**
   * Send account rejection notification
   */
  async sendAccountRejected(
    to: string,
    name: string,
    reason: string,
    supportEmail: string
  ): Promise<string> {
    return this.sendTemplateEmail('account-rejected', to, {
      name,
      reason,
      supportEmail
    })
  }

  /**
   * Send attendance reminder
   */
  async sendAttendanceReminder(
    to: string,
    studentName: string,
    className: string,
    classCode: string,
    startTime: string,
    endTime: string,
    location: string,
    lecturerName: string,
    checkInLink: string
  ): Promise<string> {
    return this.sendTemplateEmail('attendance-reminder', to, {
      studentName,
      className,
      classCode,
      startTime,
      endTime,
      location,
      lecturerName,
      checkInLink
    })
  }

  /**
   * Send OTP verification email
   */
  async sendOTPVerification(
    to: string,
    name: string,
    otpCode: string,
    expiryMinutes: number = 10
  ): Promise<string> {
    return this.sendTemplateEmail('otp-verification', to, {
      name,
      otpCode,
      expiryMinutes
    })
  }

  /**
   * Queue email for sending
   */
  private queueEmail(
    emailData: EmailData,
    options: {
      priority?: 'low' | 'normal' | 'high'
      scheduledAt?: Date
    } = {}
  ): string {
    const id = crypto.randomUUID()
    const now = new Date()

    const queueItem: EmailQueue = {
      id,
      emailData,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: options.scheduledAt || now,
      createdAt: now
    }

    // Insert based on priority
    const priorityWeight = { high: 3, normal: 2, low: 1 }
    const priority = options.priority || 'normal'
    const weight = priorityWeight[priority]

    const insertIndex = this.emailQueue.findIndex(item => {
      const itemPriority = priorityWeight[item.emailData.priority as keyof typeof priorityWeight] || 2
      return itemPriority < weight
    })

    if (insertIndex === -1) {
      this.emailQueue.push(queueItem)
    } else {
      this.emailQueue.splice(insertIndex, 0, queueItem)
    }

    return id
  }

  /**
   * Start email queue processor
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) return

    this.processingInterval = setInterval(async () => {
      await this.processEmailQueue()
    }, 5000) // Process every 5 seconds
  }

  /**
   * Process email queue
   */
  private async processEmailQueue(): Promise<void> {
    if (this.isProcessing || this.emailQueue.length === 0) return

    this.isProcessing = true

    try {
      const now = new Date()
      const emailToProcess = this.emailQueue.find(
        email => email.status === 'pending' && 
        (!email.scheduledAt || email.scheduledAt <= now)
      )

      if (emailToProcess) {
        await this.sendQueuedEmail(emailToProcess)
      }
    } catch (error) {
      console.error('Email queue processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Send queued email
   */
  private async sendQueuedEmail(queueItem: EmailQueue): Promise<void> {
    queueItem.status = 'sending'
    queueItem.attempts++

    try {
      // In real implementation, integrate with email service (SendGrid, AWS SES, etc.)
      await this.mockSendEmail(queueItem.emailData)
      
      queueItem.status = 'sent'
      queueItem.sentAt = new Date()
      
      // Remove from queue after successful send
      const index = this.emailQueue.findIndex(item => item.id === queueItem.id)
      if (index > -1) {
        this.emailQueue.splice(index, 1)
      }

      console.log(`Email sent successfully: ${queueItem.id}`)
    } catch (error) {
      queueItem.status = 'failed'
      queueItem.failedAt = new Date()
      queueItem.error = error instanceof Error ? error.message : 'Unknown error'

      if (queueItem.attempts >= queueItem.maxAttempts) {
        // Remove from queue after max attempts
        const index = this.emailQueue.findIndex(item => item.id === queueItem.id)
        if (index > -1) {
          this.emailQueue.splice(index, 1)
        }
        console.error(`Email failed permanently: ${queueItem.id}`, error)
      } else {
        // Reset status for retry
        queueItem.status = 'pending'
        queueItem.scheduledAt = new Date(Date.now() + queueItem.attempts * 60000) // Exponential backoff
        console.warn(`Email failed, will retry: ${queueItem.id}`, error)
      }
    }
  }

  /**
   * Mock email sending (replace with real email service)
   */
  private async mockSendEmail(emailData: EmailData): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Log email for development
    console.log('📧 Email sent:', {
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      timestamp: new Date().toISOString()
    })

    // In production, replace with actual email service:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    // - Postmark
    // etc.
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match
    })
  }

  /**
   * Get email queue status
   */
  getQueueStatus(): {
    pending: number
    sending: number
    failed: number
    total: number
  } {
    const pending = this.emailQueue.filter(email => email.status === 'pending').length
    const sending = this.emailQueue.filter(email => email.status === 'sending').length
    const failed = this.emailQueue.filter(email => email.status === 'failed').length

    return {
      pending,
      sending,
      failed,
      total: this.emailQueue.length
    }
  }

  /**
   * Add custom email template
   */
  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template)
  }

  /**
   * Get email template
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * Stop email queue processor
   */
  stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  /**
   * Clear email queue
   */
  clearQueue(): void {
    this.emailQueue = []
  }
}