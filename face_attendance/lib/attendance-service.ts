// face_attendance/lib/attendance-service.ts
import { DateUtils, FormatUtils } from './utils'
import { ATTENDANCE_CONSTANTS } from './constants'

export interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  date: string
  status: AttendanceStatus
  checkInTime?: string
  checkOutTime?: string
  method: AttendanceMethod
  confidence?: number
  location?: string
  deviceInfo?: string
  notes?: string
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'PENDING'
export type AttendanceMethod = 'FACE_RECOGNITION' | 'QR_CODE' | 'MANUAL' | 'AUTO_MARKED'

export interface ClassSession {
  id: string
  classId: string
  date: string
  startTime: string
  endTime: string
  location: {
    name: string
    wifiSSIDs: string[]
    coordinates?: { lat: number; lng: number; radius: number }
  }
  attendanceWindow: {
    startTime: string
    endTime: string
  }
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
}

export interface AttendanceStats {
  totalSessions: number
  attendedSessions: number
  attendanceRate: number
  lateCount: number
  absentCount: number
  excusedCount: number
  streak: {
    current: number
    longest: number
  }
}

export class AttendanceService {
  private static instance: AttendanceService

  private constructor() {}

  static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService()
    }
    return AttendanceService.instance
  }

  /**
   * Check if attendance is currently allowed for a class session
   */
  isAttendanceAllowed(session: ClassSession): {
    allowed: boolean
    reason?: string
    timeRemaining?: number
    status: 'early' | 'open' | 'late' | 'closed'
  } {
    const now = new Date()
    const currentDate = DateUtils.formatDate(now)

    // Check if it's the correct date
    if (currentDate !== session.date) {
      return {
        allowed: false,
        reason: 'Attendance is only available on the scheduled class date',
        status: 'closed'
      }
    }

    const windowStart = new Date(`${session.date}T${session.attendanceWindow.startTime}`)
    const windowEnd = new Date(`${session.date}T${session.attendanceWindow.endTime}`)
    const classStart = new Date(`${session.date}T${session.startTime}`)

    if (now < windowStart) {
      const timeRemaining = Math.ceil((windowStart.getTime() - now.getTime()) / 1000 / 60)
      return {
        allowed: false,
        reason: `Attendance opens ${timeRemaining} minutes before class starts`,
        timeRemaining,
        status: 'early'
      }
    }

    if (now > windowEnd) {
      return {
        allowed: false,
        reason: 'Attendance window has closed',
        status: 'closed'
      }
    }

    if (now > classStart) {
      const minutesLate = Math.ceil((now.getTime() - classStart.getTime()) / 1000 / 60)
      if (minutesLate > ATTENDANCE_CONSTANTS.LATE_THRESHOLD) {
        return {
          allowed: true,
          reason: `You are ${minutesLate} minutes late`,
          status: 'late'
        }
      }
    }

    return {
      allowed: true,
      status: 'open'
    }
  }

  /**
   * Determine attendance status based on check-in time
   */
  determineAttendanceStatus(
    checkInTime: Date,
    classSession: ClassSession
  ): AttendanceStatus {
    const classStart = new Date(`${classSession.date}T${classSession.startTime}`)
    const timeDifference = (checkInTime.getTime() - classStart.getTime()) / 1000 / 60

    if (timeDifference <= 0) {
      return 'PRESENT'
    } else if (timeDifference <= ATTENDANCE_CONSTANTS.LATE_THRESHOLD) {
      return 'LATE'
    } else {
      return 'ABSENT' // Too late to be marked as late
    }
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(
    studentId: string,
    classSession: ClassSession,
    method: AttendanceMethod,
    options: {
      confidence?: number
      location?: string
      deviceInfo?: string
      notes?: string
    } = {}
  ): Promise<AttendanceRecord> {
    const now = new Date()
    const status = this.determineAttendanceStatus(now, classSession)

    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      studentId,
      classId: classSession.classId,
      date: classSession.date,
      status,
      checkInTime: FormatUtils.formatDateTime(now),
      method,
      ...options
    }

    // In real implementation, save to database
    await this.saveAttendanceRecord(record)

    return record
  }

  /**
   * Calculate attendance statistics for a student
   */
  calculateAttendanceStats(
    records: AttendanceRecord[],
    totalSessions: number
  ): AttendanceStats {
    const attendedSessions = records.filter(r => 
      ['PRESENT', 'LATE'].includes(r.status)
    ).length

    const lateCount = records.filter(r => r.status === 'LATE').length
    const absentCount = records.filter(r => r.status === 'ABSENT').length
    const excusedCount = records.filter(r => r.status === 'EXCUSED').length

    const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0

    // Calculate attendance streak
    const sortedRecords = records
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    for (const record of sortedRecords) {
      if (['PRESENT', 'LATE'].includes(record.status)) {
        tempStreak++
        if (currentStreak === 0) currentStreak = tempStreak
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        if (currentStreak === tempStreak) currentStreak = 0
        tempStreak = 0
      }
    }

    return {
      totalSessions,
      attendedSessions,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      lateCount,
      absentCount,
      excusedCount,
      streak: {
        current: currentStreak,
        longest: longestStreak
      }
    }
  }

  /**
   * Get attendance summary for a date range
   */
  getAttendanceSummary(
    records: AttendanceRecord[],
    startDate: string,
    endDate: string
  ): {
    totalRecords: number
    statusBreakdown: Record<AttendanceStatus, number>
    methodBreakdown: Record<AttendanceMethod, number>
    dailyStats: Array<{
      date: string
      present: number
      absent: number
      late: number
      total: number
      rate: number
    }>
  } {
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return recordDate >= start && recordDate <= end
    })

    const statusBreakdown: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      PENDING: 0
    }

    const methodBreakdown: Record<AttendanceMethod, number> = {
      FACE_RECOGNITION: 0,
      QR_CODE: 0,
      MANUAL: 0,
      AUTO_MARKED: 0
    }

    filteredRecords.forEach(record => {
      statusBreakdown[record.status]++
      methodBreakdown[record.method]++
    })

    // Group by date
    const dateGroups = filteredRecords.reduce((groups, record) => {
      const date = record.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(record)
      return groups
    }, {} as Record<string, AttendanceRecord[]>)

    const dailyStats = Object.entries(dateGroups).map(([date, dayRecords]) => {
      const present = dayRecords.filter(r => r.status === 'PRESENT').length
      const absent = dayRecords.filter(r => r.status === 'ABSENT').length
      const late = dayRecords.filter(r => r.status === 'LATE').length
      const total = dayRecords.length
      const rate = total > 0 ? ((present + late) / total) * 100 : 0

      return {
        date,
        present,
        absent,
        late,
        total,
        rate: Math.round(rate * 100) / 100
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      totalRecords: filteredRecords.length,
      statusBreakdown,
      methodBreakdown,
      dailyStats
    }
  }

  /**
   * Check for duplicate attendance
   */
  async checkDuplicateAttendance(
    studentId: string,
    classId: string,
    date: string
  ): Promise<AttendanceRecord | null> {
    // In real implementation, query database
    const existingRecord = await this.findAttendanceRecord(studentId, classId, date)
    return existingRecord
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(
    recordId: string,
    updates: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord> {
    // In real implementation, update database
    const record = await this.getAttendanceRecord(recordId)
    if (!record) {
      throw new Error('Attendance record not found')
    }

    const updatedRecord = { ...record, ...updates }
    await this.saveAttendanceRecord(updatedRecord)

    return updatedRecord
  }

  /**
   * Mark student as absent for missed sessions
   */
  async markAbsentForMissedSessions(
    studentId: string,
    missedSessions: ClassSession[]
  ): Promise<AttendanceRecord[]> {
    const absentRecords: AttendanceRecord[] = []

    for (const session of missedSessions) {
      const existingRecord = await this.checkDuplicateAttendance(
        studentId,
        session.classId,
        session.date
      )

      if (!existingRecord) {
        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          studentId,
          classId: session.classId,
          date: session.date,
          status: 'ABSENT',
          method: 'AUTO_MARKED',
          notes: 'Auto-marked as absent for missed session'
        }

        await this.saveAttendanceRecord(record)
        absentRecords.push(record)
      }
    }

    return absentRecords
  }

  /**
   * Generate attendance report
   */
  generateAttendanceReport(
    records: AttendanceRecord[],
    format: 'summary' | 'detailed' = 'summary'
  ): {
    metadata: {
      generatedAt: string
      totalRecords: number
      dateRange: { start: string; end: string }
    }
    statistics: AttendanceStats
    records?: AttendanceRecord[]
  } {
    const sortedRecords = records.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const dateRange = {
      start: sortedRecords[0]?.date || '',
      end: sortedRecords[sortedRecords.length - 1]?.date || ''
    }

    const totalSessions = new Set(records.map(r => `${r.classId}-${r.date}`)).size
    const statistics = this.calculateAttendanceStats(records, totalSessions)

    const report = {
      metadata: {
        generatedAt: FormatUtils.formatDateTime(new Date()),
        totalRecords: records.length,
        dateRange
      },
      statistics
    }

    if (format === 'detailed') {
      return { ...report, records: sortedRecords }
    }

    return report
  }

  /**
   * Validate attendance record
   */
  validateAttendanceRecord(record: Partial<AttendanceRecord>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!record.studentId) errors.push('Student ID is required')
    if (!record.classId) errors.push('Class ID is required')
    if (!record.date) errors.push('Date is required')
    if (!record.status) errors.push('Status is required')
    if (!record.method) errors.push('Method is required')

    if (record.date && !this.isValidDate(record.date)) {
      errors.push('Invalid date format')
    }

    if (record.checkInTime && !this.isValidDateTime(record.checkInTime)) {
      errors.push('Invalid check-in time format')
    }

    if (record.confidence && (record.confidence < 0 || record.confidence > 1)) {
      errors.push('Confidence must be between 0 and 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Private helper methods
  private async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    // In real implementation, save to database via API
    console.log('Saving attendance record:', record)
  }

  private async findAttendanceRecord(
    studentId: string,
    classId: string,
    date: string
  ): Promise<AttendanceRecord | null> {
    // In real implementation, query database via API
    console.log('Finding attendance record:', { studentId, classId, date })
    return null
  }

  private async getAttendanceRecord(recordId: string): Promise<AttendanceRecord | null> {
    // In real implementation, query database via API
    console.log('Getting attendance record:', recordId)
    return null
  }

  private isValidDate(date: string): boolean {
    try {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime()) && date.length >= 8
    } catch {
      return false
    }
  }

  private isValidDateTime(dateTime: string): boolean {
    try {
      const parsedDateTime = new Date(dateTime)
      return !isNaN(parsedDateTime.getTime()) && dateTime.length >= 10
    } catch {
      return false
    }
  }
}