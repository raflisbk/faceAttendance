// face_attendance/lib/report-generator.ts
import { DateUtils, FormatUtils } from './utils'

export interface ReportConfig {
  title: string
  subtitle?: string
  author?: string
  dateRange?: {
    start: Date
    end: Date
  }
  logo?: string
  footer?: string
}

export interface AttendanceReportData {
  student: {
    id: string
    name: string
    studentId: string
    email: string
  }
  class: {
    id: string
    name: string
    code: string
    lecturer: string
  }
  records: Array<{
    date: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    checkInTime?: string
    method: string
    confidence?: number
  }>
  statistics: {
    totalSessions: number
    attendedSessions: number
    attendanceRate: number
    lateCount: number
    absentCount: number
    excusedCount: number
  }
}

export interface ClassReportData {
  class: {
    id: string
    name: string
    code: string
    lecturer: string
    schedule: string
    location: string
  }
  students: Array<{
    id: string
    name: string
    studentId: string
    attendanceRate: number
    totalSessions: number
    presentCount: number
    lateCount: number
    absentCount: number
  }>
  sessions: Array<{
    date: string
    attendanceCount: number
    totalStudents: number
    attendanceRate: number
  }>
  overallStats: {
    totalStudents: number
    averageAttendanceRate: number
    totalSessions: number
    bestAttendanceRate: number
    worstAttendanceRate: number
  }
}

export interface SystemReportData {
  dateRange: {
    start: string
    end: string
  }
  overview: {
    totalUsers: number
    totalClasses: number
    totalSessions: number
    totalAttendanceRecords: number
  }
  userStats: {
    students: number
    lecturers: number
    admins: number
    pendingApprovals: number
  }
  attendanceStats: {
    averageAttendanceRate: number
    faceRecognitionUsage: number
    manualEntryUsage: number
    qrCodeUsage: number
  }
  topPerformingClasses: Array<{
    className: string
    attendanceRate: number
    totalStudents: number
  }>
  trends: {
    daily: Array<{ date: string; attendanceRate: number }>
    weekly: Array<{ week: string; attendanceRate: number }>
    monthly: Array<{ month: string; attendanceRate: number }>
  }
}

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json'

export class ReportGenerator {
  private static instance: ReportGenerator

  private constructor() {}

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator()
    }
    return ReportGenerator.instance
  }

  /**
   * Generate student attendance report
   */
  async generateStudentReport(
    data: AttendanceReportData,
    format: ReportFormat = 'pdf',
    config: Partial<ReportConfig> = {}
  ): Promise<Buffer | string> {
    const reportConfig: ReportConfig = {
      title: 'Student Attendance Report',
      subtitle: `${data.student.name} (${data.student.studentId})`,
      author: 'Face Attendance System',
      ...config
    }

    switch (format) {
      case 'pdf':
        return this.generateStudentPDF(data, reportConfig)
      case 'excel':
        return this.generateStudentExcel(data, reportConfig)
      case 'csv':
        return this.generateStudentCSV(data, reportConfig)
      case 'json':
        return this.generateStudentJSON(data, reportConfig)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Generate class attendance report
   */
  async generateClassReport(
    data: ClassReportData,
    format: ReportFormat = 'pdf',
    config: Partial<ReportConfig> = {}
  ): Promise<Buffer | string> {
    const reportConfig: ReportConfig = {
      title: 'Class Attendance Report',
      subtitle: `${data.class.name} (${data.class.code})`,
      author: 'Face Attendance System',
      ...config
    }

    switch (format) {
      case 'pdf':
        return this.generateClassPDF(data, reportConfig)
      case 'excel':
        return this.generateClassExcel(data, reportConfig)
      case 'csv':
        return this.generateClassCSV(data, reportConfig)
      case 'json':
        return this.generateClassJSON(data, reportConfig)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Generate system analytics report
   */
  async generateSystemReport(
    data: SystemReportData,
    format: ReportFormat = 'pdf',
    config: Partial<ReportConfig> = {}
  ): Promise<Buffer | string> {
    const reportConfig: ReportConfig = {
      title: 'System Analytics Report',
      subtitle: `${data.dateRange.start} to ${data.dateRange.end}`,
      author: 'Face Attendance System',
      ...config
    }

    switch (format) {
      case 'pdf':
        return this.generateSystemPDF(data, reportConfig)
      case 'excel':
        return this.generateSystemExcel(data, reportConfig)
      case 'csv':
        return this.generateSystemCSV(data, reportConfig)
      case 'json':
        return this.generateSystemJSON(data, reportConfig)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Generate student PDF report
   */
  private async generateStudentPDF(
    data: AttendanceReportData,
    config: ReportConfig
  ): Promise<Buffer> {
    // In real implementation, use libraries like jsPDF, Puppeteer, or PDFKit
    const html = this.generateStudentHTML(data, config)
    
    // Mock PDF generation - replace with actual PDF library
    const pdfBuffer = Buffer.from(html, 'utf8')
    
    console.log('Generated Student PDF Report')
    return pdfBuffer
  }

  /**
   * Generate student HTML for PDF conversion
   */
  private generateStudentHTML(data: AttendanceReportData, config: ReportConfig): string {
    const { student, class: classInfo, records, statistics } = data
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 18px; color: #666; margin-bottom: 20px; }
          .info-section { margin-bottom: 30px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table th, .info-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .stat-label { font-size: 14px; color: #666; }
          .records-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .records-table th, .records-table td { padding: 10px; text-align: left; border: 1px solid #ddd; }
          .records-table th { background: #f8f9fa; font-weight: bold; }
          .status-present { color: #28a745; font-weight: bold; }
          .status-late { color: #ffc107; font-weight: bold; }
          .status-absent { color: #dc3545; font-weight: bold; }
          .status-excused { color: #6c757d; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.title}</div>
          <div class="subtitle">${config.subtitle}</div>
          ${config.dateRange ? `<div>Period: ${DateUtils.formatDate(config.dateRange.start)} - ${DateUtils.formatDate(config.dateRange.end)}</div>` : ''}
        </div>

        <div class="info-section">
          <h3>Student Information</h3>
          <table class="info-table">
            <tr><th>Name:</th><td>${student.name}</td></tr>
            <tr><th>Student ID:</th><td>${student.studentId}</td></tr>
            <tr><th>Email:</th><td>${student.email}</td></tr>
            <tr><th>Class:</th><td>${classInfo.name} (${classInfo.code})</td></tr>
            <tr><th>Lecturer:</th><td>${classInfo.lecturer}</td></tr>
          </table>
        </div>

        <div class="info-section">
          <h3>Attendance Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${statistics.attendanceRate.toFixed(1)}%</div>
              <div class="stat-label">Attendance Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${statistics.attendedSessions}</div>
              <div class="stat-label">Sessions Attended</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${statistics.totalSessions}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${statistics.lateCount}</div>
              <div class="stat-label">Late Arrivals</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${statistics.absentCount}</div>
              <div class="stat-label">Absences</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${statistics.excusedCount}</div>
              <div class="stat-label">Excused</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Attendance Records</h3>
          <table class="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check-in Time</th>
                <th>Method</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(record => `
                <tr>
                  <td>${DateUtils.formatDate(new Date(record.date))}</td>
                  <td class="status-${record.status.toLowerCase()}">${record.status}</td>
                  <td>${record.checkInTime ? FormatUtils.formatTime(new Date(record.checkInTime)) : '-'}</td>
                  <td>${record.method}</td>
                  <td>${record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${FormatUtils.formatDateTime(new Date())} by ${config.author}</p>
          ${config.footer ? `<p>${config.footer}</p>` : ''}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate student Excel report
   */
  private async generateStudentExcel(
    data: AttendanceReportData,
    config: ReportConfig
  ): Promise<Buffer> {
    // In real implementation, use libraries like ExcelJS or XLSX
    const csvContent = this.generateStudentCSV(data, config)
    
    // Mock Excel generation - replace with actual Excel library
    const excelBuffer = Buffer.from(csvContent, 'utf8')
    
    console.log('Generated Student Excel Report')
    return excelBuffer
  }

  /**
   * Generate student CSV report
   */
  private generateStudentCSV(data: AttendanceReportData, config: ReportConfig): string {
    const { student, class: classInfo, records, statistics } = data
    
    let csv = `${config.title}\n`
    csv += `Student Name,${student.name}\n`
    csv += `Student ID,${student.studentId}\n`
    csv += `Email,${student.email}\n`
    csv += `Class,${classInfo.name} (${classInfo.code})\n`
    csv += `Lecturer,${classInfo.lecturer}\n`
    csv += `\n`
    
    csv += `Statistics\n`
    csv += `Attendance Rate,${statistics.attendanceRate.toFixed(1)}%\n`
    csv += `Sessions Attended,${statistics.attendedSessions}\n`
    csv += `Total Sessions,${statistics.totalSessions}\n`
    csv += `Late Count,${statistics.lateCount}\n`
    csv += `Absent Count,${statistics.absentCount}\n`
    csv += `Excused Count,${statistics.excusedCount}\n`
    csv += `\n`
    
    csv += `Attendance Records\n`
    csv += `Date,Status,Check-in Time,Method,Confidence\n`
    
    records.forEach(record => {
      csv += `${record.date},${record.status},${record.checkInTime || ''},${record.method},${record.confidence ? (record.confidence * 100).toFixed(1) + '%' : ''}\n`
    })
    
    return csv
  }

  /**
   * Generate student JSON report
   */
  private generateStudentJSON(data: AttendanceReportData, config: ReportConfig): string {
    const report = {
      meta: {
        title: config.title,
        subtitle: config.subtitle,
        generatedAt: new Date().toISOString(),
        author: config.author,
        dateRange: config.dateRange
      },
      data
    }
    
    return JSON.stringify(report, null, 2)
  }

  /**
   * Generate class PDF report
   */
  private async generateClassPDF(data: ClassReportData, config: ReportConfig): Promise<Buffer> {
    const html = this.generateClassHTML(data, config)
    const pdfBuffer = Buffer.from(html, 'utf8')
    
    console.log('Generated Class PDF Report')
    return pdfBuffer
  }

  /**
   * Generate class HTML for PDF conversion
   */
  private generateClassHTML(data: ClassReportData, config: ReportConfig): string {
    const { class: classInfo, students, sessions, overallStats } = data
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 18px; color: #666; margin-bottom: 20px; }
          .info-section { margin-bottom: 30px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table th, .info-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .stat-label { font-size: 14px; color: #666; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          .data-table th, .data-table td { padding: 8px; text-align: left; border: 1px solid #ddd; }
          .data-table th { background: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.title}</div>
          <div class="subtitle">${config.subtitle}</div>
          ${config.dateRange ? `<div>Period: ${DateUtils.formatDate(config.dateRange.start)} - ${DateUtils.formatDate(config.dateRange.end)}</div>` : ''}
        </div>

        <div class="info-section">
          <h3>Class Information</h3>
          <table class="info-table">
            <tr><th>Class Name:</th><td>${classInfo.name}</td></tr>
            <tr><th>Class Code:</th><td>${classInfo.code}</td></tr>
            <tr><th>Lecturer:</th><td>${classInfo.lecturer}</td></tr>
            <tr><th>Schedule:</th><td>${classInfo.schedule}</td></tr>
            <tr><th>Location:</th><td>${classInfo.location}</td></tr>
          </table>
        </div>

        <div class="info-section">
          <h3>Overall Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${overallStats.averageAttendanceRate.toFixed(1)}%</div>
              <div class="stat-label">Average Attendance Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overallStats.totalStudents}</div>
              <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overallStats.totalSessions}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overallStats.bestAttendanceRate.toFixed(1)}%</div>
              <div class="stat-label">Best Attendance Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overallStats.worstAttendanceRate.toFixed(1)}%</div>
              <div class="stat-label">Lowest Attendance Rate</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Student Performance</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Attendance Rate</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Total Sessions</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(student => `
                <tr>
                  <td>${student.studentId}</td>
                  <td>${student.name}</td>
                  <td>${student.attendanceRate.toFixed(1)}%</td>
                  <td>${student.presentCount}</td>
                  <td>${student.lateCount}</td>
                  <td>${student.absentCount}</td>
                  <td>${student.totalSessions}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="info-section">
          <h3>Session History</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Attendance Count</th>
                <th>Total Students</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.map(session => `
                <tr>
                  <td>${session.date}</td>
                  <td>${session.attendanceCount}</td>
                  <td>${session.totalStudents}</td>
                  <td>${session.attendanceRate.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${FormatUtils.formatDateTime(new Date())} by ${config.author}</p>
          ${config.footer ? `<p>${config.footer}</p>` : ''}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate class CSV report
   */
  private generateClassCSV(data: ClassReportData, config: ReportConfig): string {
    const { class: classInfo, students, sessions, overallStats } = data
    
    let csv = `${config.title}\n`
    csv += `Class Name,${classInfo.name}\n`
    csv += `Class Code,${classInfo.code}\n`
    csv += `Lecturer,${classInfo.lecturer}\n`
    csv += `Schedule,${classInfo.schedule}\n`
    csv += `Location,${classInfo.location}\n`
    csv += `\n`
    
    csv += `Overall Statistics\n`
    csv += `Average Attendance Rate,${overallStats.averageAttendanceRate.toFixed(1)}%\n`
    csv += `Total Students,${overallStats.totalStudents}\n`
    csv += `Total Sessions,${overallStats.totalSessions}\n`
    csv += `Best Attendance Rate,${overallStats.bestAttendanceRate.toFixed(1)}%\n`
    csv += `Worst Attendance Rate,${overallStats.worstAttendanceRate.toFixed(1)}%\n`
    csv += `\n`
    
    csv += `Student Performance\n`
    csv += `Student ID,Name,Attendance Rate,Present,Late,Absent,Total Sessions\n`
    students.forEach(student => {
      csv += `${student.studentId},${student.name},${student.attendanceRate.toFixed(1)}%,${student.presentCount},${student.lateCount},${student.absentCount},${student.totalSessions}\n`
    })
    
    csv += `\n`
    csv += `Session History\n`
    csv += `Date,Attendance Count,Total Students,Attendance Rate\n`
    sessions.forEach(session => {
      csv += `${session.date},${session.attendanceCount},${session.totalStudents},${session.attendanceRate.toFixed(1)}%\n`
    })
    
    return csv
  }

  /**
   * Generate class Excel report
   */
  private async generateClassExcel(data: ClassReportData, config: ReportConfig): Promise<Buffer> {
    const csvContent = this.generateClassCSV(data, config)
    const excelBuffer = Buffer.from(csvContent, 'utf8')
    
    console.log('Generated Class Excel Report')
    return excelBuffer
  }

  /**
   * Generate class JSON report
   */
  private generateClassJSON(data: ClassReportData, config: ReportConfig): string {
    const report = {
      meta: {
        title: config.title,
        subtitle: config.subtitle,
        generatedAt: new Date().toISOString(),
        author: config.author,
        dateRange: config.dateRange
      },
      data
    }
    
    return JSON.stringify(report, null, 2)
  }

  /**
   * Generate system PDF report
   */
  private async generateSystemPDF(data: SystemReportData, config: ReportConfig): Promise<Buffer> {
    const html = this.generateSystemHTML(data, config)
    const pdfBuffer = Buffer.from(html, 'utf8')
    
    console.log('Generated System PDF Report')
    return pdfBuffer
  }

  /**
   * Generate system HTML for PDF conversion
   */
  private generateSystemHTML(data: SystemReportData, config: ReportConfig): string {
    const { overview, userStats, attendanceStats, topPerformingClasses, trends } = data
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 18px; color: #666; margin-bottom: 20px; }
          .info-section { margin-bottom: 30px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 20px; font-weight: bold; color: #007bff; }
          .stat-label { font-size: 12px; color: #666; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          .data-table th, .data-table td { padding: 8px; text-align: left; border: 1px solid #ddd; }
          .data-table th { background: #f8f9fa; font-weight: bold; }
          .chart-placeholder { background: #f8f9fa; height: 200px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; margin: 10px 0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.title}</div>
          <div class="subtitle">${config.subtitle}</div>
        </div>

        <div class="info-section">
          <h3>System Overview</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${overview.totalUsers}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overview.totalClasses}</div>
              <div class="stat-label">Total Classes</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overview.totalSessions}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${overview.totalAttendanceRecords}</div>
              <div class="stat-label">Attendance Records</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>User Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${userStats.students}</div>
              <div class="stat-label">Students</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${userStats.lecturers}</div>
              <div class="stat-label">Lecturers</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${userStats.admins}</div>
              <div class="stat-label">Admins</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${userStats.pendingApprovals}</div>
              <div class="stat-label">Pending Approvals</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Attendance Methods Usage</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${attendanceStats.averageAttendanceRate.toFixed(1)}%</div>
              <div class="stat-label">Average Attendance Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${attendanceStats.faceRecognitionUsage.toFixed(1)}%</div>
              <div class="stat-label">Face Recognition</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${attendanceStats.qrCodeUsage.toFixed(1)}%</div>
              <div class="stat-label">QR Code</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${attendanceStats.manualEntryUsage.toFixed(1)}%</div>
              <div class="stat-label">Manual Entry</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Top Performing Classes</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Attendance Rate</th>
                <th>Total Students</th>
              </tr>
            </thead>
            <tbody>
              ${topPerformingClasses.map(cls => `
                <tr>
                  <td>${cls.className}</td>
                  <td>${cls.attendanceRate.toFixed(1)}%</td>
                  <td>${cls.totalStudents}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="info-section">
          <h3>Attendance Trends</h3>
          <div class="chart-placeholder">
            Attendance trends chart would be rendered here
          </div>
          
          <h4>Weekly Trends</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${trends.weekly.slice(-10).map(week => `
                <tr>
                  <td>${week.week}</td>
                  <td>${week.attendanceRate.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${FormatUtils.formatDateTime(new Date())} by ${config.author}</p>
          ${config.footer ? `<p>${config.footer}</p>` : ''}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate system CSV report
   */
  private generateSystemCSV(data: SystemReportData, config: ReportConfig): string {
    let csv = `${config.title}\n`
    csv += `Period,${data.dateRange.start} to ${data.dateRange.end}\n`
    csv += `\n`
    
    csv += `System Overview\n`
    csv += `Total Users,${data.overview.totalUsers}\n`
    csv += `Total Classes,${data.overview.totalClasses}\n`
    csv += `Total Sessions,${data.overview.totalSessions}\n`
    csv += `Total Attendance Records,${data.overview.totalAttendanceRecords}\n`
    csv += `\n`
    
    csv += `User Statistics\n`
    csv += `Students,${data.userStats.students}\n`
    csv += `Lecturers,${data.userStats.lecturers}\n`
    csv += `Admins,${data.userStats.admins}\n`
    csv += `Pending Approvals,${data.userStats.pendingApprovals}\n`
    csv += `\n`
    
    csv += `Top Performing Classes\n`
    csv += `Class Name,Attendance Rate,Total Students\n`
    data.topPerformingClasses.forEach(cls => {
      csv += `${cls.className},${cls.attendanceRate.toFixed(1)}%,${cls.totalStudents}\n`
    })
    
    return csv
  }

  /**
   * Generate system Excel report
   */
  private async generateSystemExcel(data: SystemReportData, config: ReportConfig): Promise<Buffer> {
    const csvContent = this.generateSystemCSV(data, config)
    const excelBuffer = Buffer.from(csvContent, 'utf8')
    
    console.log('Generated System Excel Report')
    return excelBuffer
  }

  /**
   * Generate system JSON report
   */
  private generateSystemJSON(data: SystemReportData, config: ReportConfig): string {
    const report = {
      meta: {
        title: config.title,
        subtitle: config.subtitle,
        generatedAt: new Date().toISOString(),
        author: config.author,
        dateRange: config.dateRange
      },
      data
    }
    
    return JSON.stringify(report, null, 2)
  }

  /**
   * Get report file extension
   */
  getFileExtension(format: ReportFormat): string {
    const extensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      json: 'json'
    }
    return extensions[format]
  }

  /**
   * Get report MIME type
   */
  getMimeType(format: ReportFormat): string {
    const mimeTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json'
    }
    return mimeTypes[format]
  }
}