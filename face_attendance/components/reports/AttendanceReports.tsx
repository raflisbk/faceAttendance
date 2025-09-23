import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Search,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface AttendanceRecord {
  id: string
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
  }
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  checkInTime?: string
  method: 'FACE_RECOGNITION' | 'QR_CODE' | 'MANUAL'
  confidence?: number
  location?: string
}

interface AttendanceStats {
  totalSessions: number
  totalStudents: number
  averageAttendance: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  trends: {
    daily: { date: string; rate: number }[]
    weekly: { week: string; rate: number }[]
    monthly: { month: string; rate: number }[]
  }
}

interface AttendanceReportProps {
  userRole: 'ADMIN' | 'LECTURER' | 'STUDENT'
  userId?: string
  className?: string
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  userRole,
  userId,
  className
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL')
  const [selectedStudent, setSelectedStudent] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<string>('LAST_30_DAYS')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Data
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const toast = useToastHelpers()

  const dateRangeOptions = [
    { value: 'TODAY', label: 'Today' },
    { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'LAST_MONTH', label: 'Last Month' },
    { value: 'THIS_SEMESTER', label: 'This Semester' },
    { value: 'CUSTOM', label: 'Custom Range' }
  ]

  useEffect(() => {
    loadInitialData()
  }, [userRole, userId])

  useEffect(() => {
    loadAttendanceData()
  }, [selectedClass, selectedStudent, dateRange, statusFilter])

  const loadInitialData = async () => {
    try {
      // Load classes and students based on user role
      const classesResponse = await fetch(
        userRole === 'LECTURER' 
          ? `/api/classes/lecturer/${userId}`
          : '/api/classes'
      )
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        setClasses(classesData.classes || [])
      }

      if (userRole !== 'STUDENT') {
        const studentsResponse = await fetch('/api/students')
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json()
          setStudents(studentsData.students || [])
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data')
    }
  }

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        dateRange,
        ...(selectedClass !== 'ALL' && { classId: selectedClass }),
        ...(selectedStudent !== 'ALL' && { studentId: selectedStudent }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(userRole === 'LECTURER' && userId && { lecturerId: userId }),
        ...(userRole === 'STUDENT' && userId && { studentId: userId })
      })

      const response = await fetch(`/api/reports/attendance?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.records || [])
        setStats(data.stats || null)
      } else {
        toast.error('Failed to load attendance data')
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async (format: 'CSV' | 'PDF' | 'EXCEL') => {
    try {
      setIsExporting(true)
      
      const params = new URLSearchParams({
        format: format.toLowerCase(),
        dateRange,
        ...(selectedClass !== 'ALL' && { classId: selectedClass }),
        ...(selectedStudent !== 'ALL' && { studentId: selectedStudent }),
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      })

      const response = await fetch(`/api/reports/attendance/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-report-${DateUtils.formatDate(new Date())}.${format.toLowerCase()}`
        a.click()
        URL.revokeObjectURL(url)
        
        toast.success(`Report exported as ${format}`)
      } else {
        toast.error('Failed to export report')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'ABSENT': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'LATE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'EXCUSED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'FACE_RECOGNITION': return '👤'
      case 'QR_CODE': return '📱'
      case 'MANUAL': return '✋'
      default: return '❓'
    }
  }

  const filteredRecords = attendanceRecords.filter(record => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        record.student.name.toLowerCase().includes(searchLower) ||
        record.student.studentId.toLowerCase().includes(searchLower) ||
        record.class.name.toLowerCase().includes(searchLower) ||
        record.class.code.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading attendance report..." className="py-12" />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Attendance Reports
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive attendance analytics and insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadAttendanceData()}
            variant="chalkOutline"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => exportReport('CSV')}
              variant="chalkOutline"
              disabled={isExporting}
            >
              CSV
            </Button>
            <Button
              onClick={() => exportReport('EXCEL')}
              variant="chalkOutline"
              disabled={isExporting}
            >
              Excel
            </Button>
            <Button
              onClick={() => exportReport('PDF')}
              variant="chalk"
              disabled={isExporting}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {userRole !== 'STUDENT' && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {userRole === 'ADMIN' && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Students</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="EXCUSED">Excused</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {stats.totalStudents}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round(stats.averageAttendance * 100)}%
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Average Attendance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {stats.totalSessions}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.absentCount}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Absences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.presentCount}
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {Math.round((stats.presentCount / (stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.absentCount}
                    </span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {Math.round((stats.absentCount / (stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.lateCount}
                    </span>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      {Math.round((stats.lateCount / (stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Excused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.excusedCount}
                    </span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {Math.round((stats.excusedCount / (stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Attendance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.trends.weekly.slice(-4).map((week, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {week.week}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-slate-800 dark:bg-slate-300 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${week.rate * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 w-12 text-right">
                        {Math.round(week.rate * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Attendance Records ({filteredRecords.length})
            </span>
            {filteredRecords.length > 0 && (
              <span className="text-sm font-normal text-slate-500">
                Showing {filteredRecords.length} of {attendanceRecords.length} records
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                No attendance records found
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Class
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Check-in Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Method
                    </th>
                    {userRole === 'ADMIN' && (
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        Confidence
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {record.student.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {record.student.studentId}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {record.class.name}
                          </p>
                          <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                            {record.class.code}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {FormatUtils.formatDate(record.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(record.status)
                        )}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {record.checkInTime ? FormatUtils.formatTime(record.checkInTime) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getMethodIcon(record.method)}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {record.method.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      {userRole === 'ADMIN' && (
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {record.confidence ? `${Math.round(record.confidence * 100)}%` : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {filteredRecords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>
                Total records: {filteredRecords.length}
              </span>
              <span>
                Last updated: {FormatUtils.formatDateTime(new Date())}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AttendanceReport