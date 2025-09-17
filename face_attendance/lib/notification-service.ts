// face_attendance/lib/notification-service.ts
import { randomUUID } from 'crypto'
import { DateUtils } from './utils'

export interface NotificationData {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: string
  expiresAt?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: NotificationCategory
}

export type NotificationType = 
  | 'ATTENDANCE_REMINDER'
  | 'ATTENDANCE_SUCCESS'
  | 'ATTENDANCE_FAILED'
  | 'CLASS_CANCELLED'
  | 'CLASS_RESCHEDULED'
  | 'FACE_ENROLLMENT_SUCCESS'
  | 'FACE_ENROLLMENT_FAILED'
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'
  | 'SYSTEM_MAINTENANCE'
  | 'SECURITY_ALERT'

export type NotificationCategory = 
  | 'attendance'
  | 'enrollment'
  | 'account'
  | 'system'
  | 'security'

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class NotificationService {
  private static instance: NotificationService
  private notifications: NotificationData[] = []
  private subscribers: Map<string, PushSubscription> = new Map()
  private notificationPermission: NotificationPermission = 'default'

  private constructor() {
    this.checkNotificationPermission()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    this.notificationPermission = permission
    return permission
  }

  /**
   * Check current notification permission
   */
  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission
    }
  }

  /**
   * Send browser notification
   */
  async sendBrowserNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<boolean> {
    if (this.notificationPermission !== 'granted') {
      console.warn('Notification permission not granted')
      return false
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return true
    } catch (error) {
      console.error('Failed to send browser notification:', error)
      return false
    }
  }

  /**
   * Create and store notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      data?: Record<string, any>
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      expiresAt?: Date
      sendBrowser?: boolean
      sendPush?: boolean
    } = {}
  ): Promise<NotificationData> {
    const notification: NotificationData = {
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      ...(options.data && { data: options.data }),
      read: false,
      createdAt: DateUtils.formatDate(new Date()),
      ...(options.expiresAt && { expiresAt: DateUtils.formatDate(options.expiresAt) }),
      priority: options.priority || 'medium',
      category: this.getCategoryFromType(type)
    }

    // Store notification
    this.notifications.push(notification)
    await this.saveNotification(notification)

    // Send browser notification if requested
    if (options.sendBrowser !== false && this.notificationPermission === 'granted') {
      await this.sendBrowserNotification(title, {
        body: message,
        tag: notification.id,
        data: notification.data
      })
    }

    // Send push notification if requested
    if (options.sendPush && this.subscribers.has(userId)) {
      await this.sendPushNotification(userId, notification)
    }

    return notification
  }

  /**
   * Get category from notification type
   */
  private getCategoryFromType(type: NotificationType): NotificationCategory {
    const categoryMap: Record<NotificationType, NotificationCategory> = {
      ATTENDANCE_REMINDER: 'attendance',
      ATTENDANCE_SUCCESS: 'attendance',
      ATTENDANCE_FAILED: 'attendance',
      CLASS_CANCELLED: 'attendance',
      CLASS_RESCHEDULED: 'attendance',
      FACE_ENROLLMENT_SUCCESS: 'enrollment',
      FACE_ENROLLMENT_FAILED: 'enrollment',
      ACCOUNT_APPROVED: 'account',
      ACCOUNT_REJECTED: 'account',
      SYSTEM_MAINTENANCE: 'system',
      SECURITY_ALERT: 'security'
    }
    return categoryMap[type]
  }

  /**
   * Send attendance reminder notifications
   */
  async sendAttendanceReminder(
    userId: string,
    className: string,
    startTime: string,
    location: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'ATTENDANCE_REMINDER',
      'Class Starting Soon',
      `${className} starts in 15 minutes at ${location}`,
      {
        data: { className, startTime, location },
        priority: 'high',
        sendBrowser: true
      }
    )
  }

  /**
   * Send attendance success notification
   */
  async sendAttendanceSuccess(
    userId: string,
    className: string,
    timestamp: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'ATTENDANCE_SUCCESS',
      'Attendance Recorded',
      `Successfully checked in to ${className}`,
      {
        data: { className, timestamp },
        priority: 'medium'
      }
    )
  }

  /**
   * Send attendance failed notification
   */
  async sendAttendanceFailed(
    userId: string,
    className: string,
    reason: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'ATTENDANCE_FAILED',
      'Attendance Failed',
      `Could not record attendance for ${className}: ${reason}`,
      {
        data: { className, reason },
        priority: 'high',
        sendBrowser: true
      }
    )
  }

  /**
   * Send face enrollment notifications
   */
  async sendFaceEnrollmentResult(
    userId: string,
    success: boolean,
    message: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      success ? 'FACE_ENROLLMENT_SUCCESS' : 'FACE_ENROLLMENT_FAILED',
      success ? 'Face Enrollment Complete' : 'Face Enrollment Failed',
      message,
      {
        priority: success ? 'medium' : 'high',
        sendBrowser: !success
      }
    )
  }

  /**
   * Send account status notifications
   */
  async sendAccountStatusUpdate(
    userId: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    const title = approved ? 'Account Approved' : 'Account Rejected'
    const message = approved 
      ? 'Your account has been approved. You can now use the attendance system.'
      : `Your account application was rejected. ${reason || 'Please contact support for more information.'}`

    await this.createNotification(
      userId,
      approved ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
      title,
      message,
      {
        priority: 'high',
        sendBrowser: true,
        data: { approved, reason }
      }
    )
  }

  /**
   * Send system maintenance notification
   */
  async sendMaintenanceNotification(
    userIds: string[],
    startTime: Date,
    duration: number
  ): Promise<void> {
    const message = `System maintenance scheduled from ${DateUtils.formatDate(startTime)} for ${duration} hours`

    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'SYSTEM_MAINTENANCE',
        'Scheduled Maintenance',
        message,
        {
          priority: 'medium',
          data: { startTime: startTime.toISOString(), duration },
          expiresAt: new Date(startTime.getTime() + duration * 60 * 60 * 1000)
        }
      )
    }
  }

  /**
   * Get notifications for user
   */
  getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean
      category?: NotificationCategory
      limit?: number
      offset?: number
    } = {}
  ): NotificationData[] {
    let userNotifications = this.notifications
      .filter(n => n.userId === userId)
      .filter(n => !n.expiresAt || new Date(n.expiresAt) > new Date())

    if (options.unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read)
    }

    if (options.category) {
      userNotifications = userNotifications.filter(n => n.category === options.category)
    }

    // Sort by priority and creation time
    userNotifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const offset = options.offset || 0
    const limit = options.limit || userNotifications.length

    return userNotifications.slice(offset, offset + limit)
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (!notification) return false

    notification.read = true
    await this.updateNotification(notification)
    return true
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const userNotifications = this.notifications.filter(
      n => n.userId === userId && !n.read
    )

    for (const notification of userNotifications) {
      notification.read = true
      await this.updateNotification(notification)
    }

    return userNotifications.length
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index === -1) return false

    this.notifications.splice(index, 1)
    await this.removeNotification(notificationId)
    return true
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId: string): {
    total: number
    unread: number
    byCategory: Record<NotificationCategory, number>
    byPriority: Record<string, number>
  } {
    const userNotifications = this.notifications.filter(n => n.userId === userId)
    const unreadCount = userNotifications.filter(n => !n.read).length

    const byCategory: Record<NotificationCategory, number> = {
      attendance: 0,
      enrollment: 0,
      account: 0,
      system: 0,
      security: 0
    }

    const byPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }

    userNotifications.forEach(notification => {
      if (notification.category) {
        byCategory[notification.category]++
      }
      if (notification.priority && notification.priority in byPriority) {
        const priority = notification.priority as keyof typeof byPriority
        if (byPriority[priority] !== undefined) {
          byPriority[priority]++
        }
      }
    })

    return {
      total: userNotifications.length,
      unread: unreadCount,
      byCategory,
      byPriority
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string, subscription: PushSubscription): Promise<void> {
    this.subscribers.set(userId, subscription)
    // In real implementation, save subscription to database
    await this.savePushSubscription(userId, subscription)
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string): Promise<void> {
    this.subscribers.delete(userId)
    // In real implementation, remove subscription from database
    await this.removePushSubscription(userId)
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const now = new Date()
    const expiredNotifications = this.notifications.filter(
      n => n.expiresAt && new Date(n.expiresAt) <= now
    )

    for (const notification of expiredNotifications) {
      await this.deleteNotification(notification.id)
    }

    return expiredNotifications.length
  }

  // Private helper methods
  private async saveNotification(notification: NotificationData): Promise<void> {
    // In real implementation, save to database via API
    console.log('Saving notification:', notification)
  }

  private async updateNotification(notification: NotificationData): Promise<void> {
    // In real implementation, update database via API
    console.log('Updating notification:', notification)
  }

  private async removeNotification(notificationId: string): Promise<void> {
    // In real implementation, remove from database via API
    console.log('Removing notification:', notificationId)
  }

  private async sendPushNotification(
    userId: string,
    notification: NotificationData
  ): Promise<void> {
    // In real implementation, send push notification via service worker
    console.log('Sending push notification:', { userId, notification })
  }

  private async savePushSubscription(
    userId: string,
    subscription: PushSubscription
  ): Promise<void> {
    // In real implementation, save to database via API
    console.log('Saving push subscription:', { userId, subscription })
  }

  private async removePushSubscription(userId: string): Promise<void> {
    // In real implementation, remove from database via API
    console.log('Removing push subscription:', userId)
  }
}