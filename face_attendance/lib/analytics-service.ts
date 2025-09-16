// face_attendance/lib/analytics-service.ts
import { DateUtils } from './utils'

export interface AnalyticsEvent {
  id: string
  userId?: string | undefined
  sessionId?: string | undefined
  eventType: string
  eventCategory: string
  eventAction: string
  eventLabel?: string | undefined
  eventValue?: number | undefined
  properties: Record<string, any>
  timestamp: Date
  userAgent?: string | undefined
  ipAddress?: string | undefined
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet'
    os: string
    browser: string
    screen: { width: number; height: number }
  } | undefined
}

export interface AttendanceMetrics {
  totalSessions: number
  averageAttendanceRate: number
  totalStudents: number
  totalClasses: number
  methodBreakdown: {
    faceRecognition: number
    qrCode: number
    manual: number
  }
  timeDistribution: {
    hour: number
    count: number
    attendanceRate: number
  }[]
  dayOfWeekDistribution: {
    day: string
    count: number
    attendanceRate: number
  }[]
}

export interface UserEngagementMetrics {
  totalUsers: number
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  userRegistrations: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  sessionMetrics: {
    averageSessionDuration: number
    averagePageViews: number
    bounceRate: number
  }
}

export interface SystemPerformanceMetrics {
  faceRecognition: {
    averageProcessingTime: number
    successRate: number
    confidenceScores: {
      average: number
      median: number
      low: number // below 70%
      medium: number // 70-85%
      high: number // above 85%
    }
  }
  apiPerformance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
    requestsPerMinute: number
  }
  databasePerformance: {
    averageQueryTime: number
    connectionPoolUsage: number
    slowQueries: number
  }
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private events: AnalyticsEvent[] = []
  private batchSize = 100
  private flushInterval = 30000 // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.startAutoFlush()
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  /**
   * Track generic event
   */
  track(
    eventType: string,
    eventCategory: string,
    eventAction: string,
    properties: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      eventType,
      eventCategory,
      eventAction,
      eventLabel: properties.label,
      eventValue: properties.value,
      properties,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      deviceInfo: this.getDeviceInfo()
    }

    this.events.push(event)
    
    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  /**
   * Track page view
   */
  trackPageView(
    page: string,
    title?: string,
    userId?: string,
    sessionId?: string,
    properties: Record<string, any> = {}
  ): void {
    this.track(
      'page_view',
      'navigation',
      'view',
      {
        page,
        title,
        ...properties
      },
      userId,
      sessionId
    )
  }

  /**
   * Track user action
   */
  trackUserAction(
    action: string,
    category: string = 'user_interaction',
    properties: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    this.track(
      'user_action',
      category,
      action,
      properties,
      userId,
      sessionId
    )
  }

  /**
   * Track face recognition event
   */
  trackFaceRecognition(
    action: 'enrollment' | 'verification' | 'failed',
    result: {
      success: boolean
      confidence?: number
      processingTime: number
      qualityScore?: number
      error?: string
    },
    userId?: string,
    sessionId?: string
  ): void {
    this.track(
      'face_recognition',
      'biometric',
      action,
      {
        success: result.success,
        confidence: result.confidence,
        processingTime: result.processingTime,
        qualityScore: result.qualityScore,
        error: result.error
      },
      userId,
      sessionId
    )
  }

  /**
   * Track attendance event
   */
  trackAttendance(
    action: 'check_in' | 'check_out' | 'mark_absent' | 'excuse',
    details: {
      classId: string
      method: 'face_recognition' | 'qr_code' | 'manual'
      status: 'present' | 'late' | 'absent' | 'excused'
      confidence?: number
      location?: string
    },
    userId?: string,
    sessionId?: string
  ): void {
    this.track(
      'attendance',
      'academic',
      action,
      details,
      userId,
      sessionId
    )
  }

  /**
   * Track authentication event
   */
  trackAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset',
    result: {
      success: boolean
      method?: string
      error?: string
      duration?: number
    },
    userId?: string,
    sessionId?: string
  ): void {
    this.track(
      'authentication',
      'security',
      action,
      result,
      userId,
      sessionId
    )
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    metric: string,
    value: number,
    category: string = 'performance',
    properties: Record<string, any> = {}
  ): void {
    this.track(
      'performance',
      category,
      metric,
      {
        value,
        ...properties
      }
    )
  }

  /**
   * Track error event
   */
  trackError(
    error: Error | string,
    context: {
      component?: string
      action?: string
      userId?: string
      sessionId?: string
      additionalInfo?: Record<string, any>
    } = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const stackTrace = typeof error === 'object' && error.stack ? error.stack : undefined

    this.track(
      'error',
      'system',
      'error_occurred',
      {
        message: errorMessage,
        stack: stackTrace,
        component: context.component,
        action: context.action,
        ...context.additionalInfo
      },
      context.userId,
      context.sessionId
    )
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics(
    dateRange: { start: Date; end: Date },
    filters?: {
      classId?: string
      userId?: string
      method?: string
    }
  ): Promise<AttendanceMetrics> {
    // Filter attendance events
    const attendanceEvents = this.getEventsByType('attendance', dateRange, filters)
    
    // Calculate metrics
    const totalSessions = new Set(attendanceEvents.map(e => `${e.properties.classId}-${DateUtils.formatDate(e.timestamp)}`)).size
    const totalStudents = new Set(attendanceEvents.map(e => e.userId)).size
    const totalClasses = new Set(attendanceEvents.map(e => e.properties.classId)).size
    
    // Attendance rate calculation
    const successfulAttendance = attendanceEvents.filter(e => 
      e.properties.status === 'present' || e.properties.status === 'late'
    ).length
    const averageAttendanceRate = attendanceEvents.length > 0 ? (successfulAttendance / attendanceEvents.length) * 100 : 0
    
    // Method breakdown
    const methodBreakdown = {
      faceRecognition: attendanceEvents.filter(e => e.properties.method === 'face_recognition').length,
      qrCode: attendanceEvents.filter(e => e.properties.method === 'qr_code').length,
      manual: attendanceEvents.filter(e => e.properties.method === 'manual').length
    }
    
    // Time distribution (by hour)
    const timeDistribution = this.calculateTimeDistribution(attendanceEvents)
    
    // Day of week distribution
    const dayOfWeekDistribution = this.calculateDayOfWeekDistribution(attendanceEvents)
    
    return {
      totalSessions,
      averageAttendanceRate,
      totalStudents,
      totalClasses,
      methodBreakdown,
      timeDistribution,
      dayOfWeekDistribution
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    dateRange: { start: Date; end: Date }
  ): Promise<UserEngagementMetrics> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Get all events in date range
    const allEvents = this.getEventsByDateRange(dateRange)
    
    // Calculate active users
    const dailyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneDayAgo).map(e => e.userId).filter(Boolean)
    ).size
    
    const weeklyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneWeekAgo).map(e => e.userId).filter(Boolean)
    ).size
    
    const monthlyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneMonthAgo).map(e => e.userId).filter(Boolean)
    ).size
    
    // Get registration events
    const registrationEvents = allEvents.filter(e => e.eventAction === 'register')
    
    // Calculate session metrics
    const sessionMetrics = this.calculateSessionMetrics(allEvents)
    
    return {
      totalUsers: new Set(allEvents.map(e => e.userId).filter(Boolean)).size,
      activeUsers: {
        daily: dailyActiveUsers,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers
      },
      userRegistrations: {
        total: registrationEvents.length,
        pending: registrationEvents.filter(e => e.properties.status === 'pending').length,
        approved: registrationEvents.filter(e => e.properties.status === 'approved').length,
        rejected: registrationEvents.filter(e => e.properties.status === 'rejected').length
      },
      sessionMetrics
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformanceMetrics(
    dateRange: { start: Date; end: Date }
  ): Promise<SystemPerformanceMetrics> {
    const performanceEvents = this.getEventsByType('performance', dateRange)
    const faceRecognitionEvents = this.getEventsByType('face_recognition', dateRange)
    const errorEvents = this.getEventsByType('error', dateRange)
    
    // Face recognition metrics
    const faceRecognitionMetrics = this.calculateFaceRecognitionMetrics(faceRecognitionEvents)
    
    // API performance metrics
    const apiMetrics = this.calculateAPIPerformanceMetrics(performanceEvents, errorEvents)
    
    // Database performance metrics
    const dbMetrics = this.calculateDatabaseMetrics(performanceEvents)
    
    return {
      faceRecognition: faceRecognitionMetrics,
      apiPerformance: apiMetrics,
      databasePerformance: dbMetrics
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  getRealTimeMetrics(): {
    activeUsers: number
    eventsLastHour: number
    errorRate: number
    averageResponseTime: number
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo)
    
    const activeUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean)).size
    const eventsLastHour = recentEvents.length
    const errorEvents = recentEvents.filter(e => e.eventType === 'error').length
    const errorRate = eventsLastHour > 0 ? (errorEvents / eventsLastHour) * 100 : 0
    
    const performanceEvents = recentEvents.filter(e => e.eventType === 'performance')
    const totalResponseTime = performanceEvents.reduce((sum, e) => sum + (e.eventValue || 0), 0)
    const averageResponseTime = performanceEvents.length > 0 ? totalResponseTime / performanceEvents.length : 0
    
    return {
      activeUsers,
      eventsLastHour,
      errorRate,
      averageResponseTime
    }
  }

  /**
   * Flush events to storage/external service
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return
    
    const eventsToFlush = [...this.events]
    this.events = []
    
    try {
      // In production, send to analytics service
      await this.sendToAnalyticsService(eventsToFlush)
      console.log(`Flushed ${eventsToFlush.length} analytics events`)
    } catch (error) {
      console.error('Failed to flush analytics events:', error)
      // Re-add events back to queue for retry
      this.events.unshift(...eventsToFlush)
    }
  }

  // Private helper methods

  private getDeviceInfo() {
    if (typeof window === 'undefined') return undefined
    
    const userAgent = window.navigator.userAgent
    const screen = window.screen
    
    return {
      type: this.getDeviceType(userAgent),
      os: this.getOS(userAgent),
      browser: this.getBrowser(userAgent),
      screen: {
        width: screen.width,
        height: screen.height
      }
    }
  }

  private getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private getEventsByType(
    eventType: string,
    dateRange: { start: Date; end: Date },
    filters?: Record<string, any>
  ): AnalyticsEvent[] {
    return this.events.filter(event => {
      if (event.eventType !== eventType) return false
      if (event.timestamp < dateRange.start || event.timestamp > dateRange.end) return false
      
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (event.properties[key] !== value) return false
        }
      }
      
      return true
    })
  }

  private getEventsByDateRange(dateRange: { start: Date; end: Date }): AnalyticsEvent[] {
    return this.events.filter(event => 
      event.timestamp >= dateRange.start && event.timestamp <= dateRange.end
    )
  }

  private calculateTimeDistribution(events: AnalyticsEvent[]): {
    hour: number
    count: number
    attendanceRate: number
  }[] {
    const hourlyData: Record<number, { total: number; successful: number }> = {}
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = { total: 0, successful: 0 }
    }
    
    events.forEach(event => {
      const hour = event.timestamp.getHours()
      if (hourlyData[hour]) {
        hourlyData[hour].total++

        if (event.properties?.status === 'present' || event.properties?.status === 'late') {
          hourlyData[hour].successful++
        }
      }
    })
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      count: data.total,
      attendanceRate: data.total > 0 ? (data.successful / data.total) * 100 : 0
    }))
  }

  private calculateDayOfWeekDistribution(events: AnalyticsEvent[]): {
    day: string
    count: number
    attendanceRate: number
  }[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dailyData: Record<string, { total: number; successful: number }> = {}
    
    dayNames.forEach(day => {
      dailyData[day] = { total: 0, successful: 0 }
    })
    
    events.forEach(event => {
      const day = dayNames[event.timestamp.getDay()]
      if (day && dailyData[day]) {
        dailyData[day].total++

        if (event.properties?.status === 'present' || event.properties?.status === 'late') {
          dailyData[day].successful++
        }
      }
    })
    
    return Object.entries(dailyData).map(([day, data]) => ({
      day,
      count: data.total,
      attendanceRate: data.total > 0 ? (data.successful / data.total) * 100 : 0
    }))
  }

  private calculateSessionMetrics(events: AnalyticsEvent[]): {
    averageSessionDuration: number
    averagePageViews: number
    bounceRate: number
  } {
    const sessions = new Map<string, AnalyticsEvent[]>()
    
    // Group events by session
    events.forEach(event => {
      if (event.sessionId) {
        if (!sessions.has(event.sessionId)) {
          sessions.set(event.sessionId, [])
        }
        sessions.get(event.sessionId)!.push(event)
      }
    })
    
    let totalSessionDuration = 0
    let totalPageViews = 0
    let bounces = 0
    let validSessions = 0
    
    sessions.forEach(sessionEvents => {
      if (sessionEvents.length === 0) return
      
      validSessions++
      
      // Sort events by timestamp
      sessionEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Calculate session duration
      const firstEvent = sessionEvents[0]
      const lastEvent = sessionEvents[sessionEvents.length - 1]
      if (firstEvent && lastEvent) {
        const duration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()
        totalSessionDuration += duration
      }
      
      // Count page views
      const pageViews = sessionEvents.filter(e => e.eventType === 'page_view').length
      totalPageViews += pageViews
      
      // Check if it's a bounce (single page view)
      if (pageViews <= 1) {
        bounces++
      }
    })
    
    return {
      averageSessionDuration: validSessions > 0 ? totalSessionDuration / validSessions / 1000 : 0, // in seconds
      averagePageViews: validSessions > 0 ? totalPageViews / validSessions : 0,
      bounceRate: validSessions > 0 ? (bounces / validSessions) * 100 : 0
    }
  }

  private calculateFaceRecognitionMetrics(events: AnalyticsEvent[]): {
    averageProcessingTime: number
    successRate: number
    confidenceScores: {
      average: number
      median: number
      low: number
      medium: number
      high: number
    }
  } {
    if (events.length === 0) {
      return {
        averageProcessingTime: 0,
        successRate: 0,
        confidenceScores: { average: 0, median: 0, low: 0, medium: 0, high: 0 }
      }
    }
    
    const processingTimes = events.map(e => e.properties.processingTime).filter(Boolean)
    const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    
    const successfulEvents = events.filter(e => e.properties.success)
    const successRate = (successfulEvents.length / events.length) * 100
    
    const confidenceScores = events
      .map(e => e.properties.confidence)
      .filter(c => c !== undefined && c !== null)
    
    if (confidenceScores.length === 0) {
      return {
        averageProcessingTime,
        successRate,
        confidenceScores: { average: 0, median: 0, low: 0, medium: 0, high: 0 }
      }
    }
    
    const averageConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    const sortedScores = [...confidenceScores].sort((a, b) => a - b)
    const medianConfidence = sortedScores[Math.floor(sortedScores.length / 2)]
    
    const lowConfidence = confidenceScores.filter(s => s < 0.7).length
    const mediumConfidence = confidenceScores.filter(s => s >= 0.7 && s < 0.85).length
    const highConfidence = confidenceScores.filter(s => s >= 0.85).length
    
    return {
      averageProcessingTime,
      successRate,
      confidenceScores: {
        average: averageConfidence,
        median: medianConfidence,
        low: lowConfidence,
        medium: mediumConfidence,
        high: highConfidence
      }
    }
  }

  private calculateAPIPerformanceMetrics(
    performanceEvents: AnalyticsEvent[],
    errorEvents: AnalyticsEvent[]
  ): {
    averageResponseTime: number
    successRate: number
    errorRate: number
    requestsPerMinute: number
  } {
    const apiEvents = performanceEvents.filter(e => e.eventAction.includes('api'))
    
    if (apiEvents.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 100,
        errorRate: 0,
        requestsPerMinute: 0
      }
    }
    
    const responseTimes = apiEvents.map(e => e.eventValue || 0)
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    
    const apiErrors = errorEvents.filter(e => e.properties.component?.includes('api'))
    const totalRequests = apiEvents.length + apiErrors.length
    
    const successRate = totalRequests > 0 ? (apiEvents.length / totalRequests) * 100 : 100
    const errorRate = totalRequests > 0 ? (apiErrors.length / totalRequests) * 100 : 0
    
    // Calculate requests per minute
    const timeSpan = Math.max(...apiEvents.map(e => e.timestamp.getTime())) - 
                   Math.min(...apiEvents.map(e => e.timestamp.getTime()))
    const requestsPerMinute = timeSpan > 0 ? (totalRequests / (timeSpan / 60000)) : 0
    
    return {
      averageResponseTime,
      successRate,
      errorRate,
      requestsPerMinute
    }
  }

  private calculateDatabaseMetrics(performanceEvents: AnalyticsEvent[]): {
    averageQueryTime: number
    connectionPoolUsage: number
    slowQueries: number
  } {
    const dbEvents = performanceEvents.filter(e => e.eventAction.includes('database'))
    
    if (dbEvents.length === 0) {
      return {
        averageQueryTime: 0,
        connectionPoolUsage: 0,
        slowQueries: 0
      }
    }
    
    const queryTimes = dbEvents.map(e => e.eventValue || 0)
    const averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
    
    const slowQueries = queryTimes.filter(time => time > 1000).length // queries > 1 second
    
    // Mock connection pool usage - in production, get from actual database metrics
    const connectionPoolUsage = 75 // percentage
    
    return {
      averageQueryTime,
      connectionPoolUsage,
      slowQueries
    }
  }

  private async sendToAnalyticsService(events: AnalyticsEvent[]): Promise<void> {
    // Mock implementation - replace with actual analytics service
    // Examples: Google Analytics, Mixpanel, Amplitude, custom analytics API
    
    console.log(`Sending ${events.length} events to analytics service`)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In production, implement actual sending logic:
    // - Batch events by type
    // - Send to multiple analytics providers
    // - Handle rate limiting
    // - Implement retry logic
    // - Store events locally if sending fails
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  /**
   * Export analytics data
   */
  exportData(dateRange?: { start: Date; end: Date }): AnalyticsEvent[] {
    if (dateRange) {
      return this.getEventsByDateRange(dateRange)
    }
    return [...this.events]
  }

  /**
   * Get event counts by type
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    
    this.events.forEach(event => {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1
    })
    
    return counts
  }

  /**
   * Get funnel analysis
   */
  getFunnelAnalysis(
    steps: string[],
    dateRange: { start: Date; end: Date }
  ): Array<{
    step: string
    users: number
    completionRate: number
    dropoffRate: number
  }> {
    const events = this.getEventsByDateRange(dateRange)
    const userJourneys = new Map<string, string[]>()
    
    // Build user journeys
    events.forEach(event => {
      if (event.userId && steps.includes(event.eventAction)) {
        if (!userJourneys.has(event.userId)) {
          userJourneys.set(event.userId, [])
        }
        userJourneys.get(event.userId)!.push(event.eventAction)
      }
    })
    
    const totalUsers = userJourneys.size
    const funnelData: Array<{
      step: string
      users: number
      completionRate: number
      dropoffRate: number
    }> = []
    
    steps.forEach((step, index) => {
      const usersAtStep = Array.from(userJourneys.values()).filter(journey =>
        journey.includes(step)
      ).length
      
      const completionRate = totalUsers > 0 ? (usersAtStep / totalUsers) * 100 : 0
      const previousStepUsers = index > 0 ? funnelData[index - 1]?.users ?? totalUsers : totalUsers
      const dropoffRate = previousStepUsers > 0 ? ((previousStepUsers - usersAtStep) / previousStepUsers) * 100 : 0
      
      funnelData.push({
        step,
        users: usersAtStep,
        completionRate,
        dropoffRate
      })
    })
    
    return funnelData
  }

  /**
   * Get cohort analysis
   */
  getCohortAnalysis(
    period: 'daily' | 'weekly' | 'monthly',
    dateRange: { start: Date; end: Date }
  ): Array<{
    cohort: string
    period0: number
    period1: number
    period2: number
    period3: number
    retention: number[]
  }> {
    // Simplified cohort analysis implementation
    // In production, implement more sophisticated cohort tracking
    
    const registrationEvents = this.events.filter(e => 
      e.eventAction === 'register' && 
      e.timestamp >= dateRange.start && 
      e.timestamp <= dateRange.end
    )
    
    // Group users by registration period
    const cohorts = new Map<string, string[]>()
    
    registrationEvents.forEach(event => {
      if (event.userId) {
        const cohortKey = this.getCohortKey(event.timestamp, period)
        if (!cohorts.has(cohortKey)) {
          cohorts.set(cohortKey, [])
        }
        cohorts.get(cohortKey)!.push(event.userId)
      }
    })
    
    // Calculate retention for each cohort
    const cohortAnalysis: Array<{
      cohort: string
      period0: number
      period1: number
      period2: number
      period3: number
      retention: number[]
    }> = []
    
    cohorts.forEach((users, cohortKey) => {
      const retentionData = this.calculateCohortRetention(users, cohortKey, period)
      cohortAnalysis.push({
        cohort: cohortKey,
        period0: retentionData?.[0] || 0,
        period1: retentionData?.[1] || 0,
        period2: retentionData?.[2] || 0,
        period3: retentionData?.[3] || 0,
        retention: retentionData
      })
    })
    
    return cohortAnalysis
  }

  private getCohortKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    switch (period) {
      case 'daily':
        return DateUtils.formatDate(date)
      case 'weekly':
        const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))
        return `Week ${week}`
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      default:
        return DateUtils.formatDate(date)
    }
  }

  private calculateCohortRetention(
    users: string[],
    _cohortKey: string,
    _period: 'daily' | 'weekly' | 'monthly'
  ): number[] {
    // Simplified retention calculation
    // In production, implement proper retention tracking based on user activity
    
    const retention = [users.length] // Period 0 - all users start here
    
    // Mock retention data for demonstration
    for (let i = 1; i <= 3; i++) {
      const retainedUsers = Math.floor((retention[0] ?? 0) * Math.pow(0.7, i)) // 70% retention decay
      retention.push(retainedUsers)
    }
    
    return retention
  }

  /**
   * Stop analytics service
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    // Flush remaining events
    this.flush()
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = []
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalEvents: number
    uniqueUsers: number
    eventTypes: Record<string, number>
    timeRange: { start: Date | null; end: Date | null }
  } {
    const uniqueUsers = new Set(this.events.map(e => e.userId).filter(Boolean)).size
    const eventTypes = this.getEventCounts()
    
    const timestamps = this.events.map(e => e.timestamp)
    const timeRange = {
      start: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null,
      end: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
    }
    
    return {
      totalEvents: this.events.length,
      uniqueUsers,
      eventTypes,
      timeRange
    }
  }
}