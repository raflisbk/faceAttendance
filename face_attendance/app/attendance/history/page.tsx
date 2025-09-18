// app/attendance/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface AttendanceRecord {
  id: string
  class: {
    name: string
    code: string
    lecturer: {
      firstName: string
      lastName: string
    }
  }
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  checkInTime?: string
  method: 'FACE_RECOGNITION' | 'QR_CODE' | 'MANUAL'
  confidence?: number
  location?: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  attendanceRate: number
}

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    classId: ''
  })
  
  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    loadAttendanceHistory()
  }, [currentPage, filters])

  const loadAttendanceHistory = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })
      
      const [historyResponse, statsResponse] = await Promise.all([
        ApiClient.get(`/api/attendance/history?${params}`),
        ApiClient.get('/api/student/stats')
      ])
      
      setRecords(historyResponse.data)
      setTotalPages(historyResponse.pagination.totalPages)
      setStats(statsResponse.data)
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load attendance history'
      toast.showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })
      
      const response = await ApiClient.get(`/api/attendance/export?${params}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_history_${DateUtils.formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.showSuccess('Attendance history exported successfully')
    } catch (error) {
      toast.showError('Failed to export attendance history')
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-400 bg-green-900/20'
      case 'LATE':
        return 'text-yellow-400 bg-yellow-900/20'
      case 'ABSENT':
        return 'text-red-400 bg-red-900/20'
      case 'EXCUSED':
        return 'text-blue-400 bg-blue-900/20'
      default:
        return 'text-slate-400 bg-slate-800/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="w-4 h-4" />
      case 'LATE':
        return <AlertCircle className="w-4 h-4" />
      case 'ABSENT':
        return <XCircle className="w-4 h-4" />
      case 'EXCUSED':
        return <Clock className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'FACE_RECOGNITION':
        return '👤'
      case 'QR_CODE':
        return '📱'
      case 'MANUAL':
        return '✏️'
      default:
        return '📋'
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance History</h1>
            <p className="text-slate-400">View your complete attendance records</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={loadAttendanceHistory}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              {isExporting ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-slate-400">Total Sessions</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{stats.present}</div>
                <div className="text-sm text-slate-400">Present</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">{stats.late}</div>
                <div className="text-sm text-slate-400">Late</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-400">{stats.absent}</div>
                <div className="text-sm text-slate-400">Absent</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{stats.attendanceRate.toFixed(1)}%</div>
                <div className="text-sm text-slate-400">Attendance Rate</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search classes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="EXCUSED">Excused</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-white"
              />

              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-white"
              />

              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '',
                  status: '',
                  startDate: '',
                  endDate: '',
                  classId: ''
                })}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner className="w-8 h-8 text-white mx-auto" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Records Found</h3>
                <p className="text-slate-400">No attendance records match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 bg-slate-800/30 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-semibold">
                            {record.class.name}
                          </h3>
                          <span className="text-slate-400 text-sm">
                            ({record.class.code})
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center space-x-1",
                            getStatusColor(record.status)
                          )}>
                            {getStatusIcon(record.status)}
                            <span>{record.status}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-slate-300">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{DateUtils.formatDate(new Date(record.date), 'MMM dd, yyyy')}</span>
                          </div>
                          
                          {record.checkInTime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>{FormatUtils.formatTime(record.checkInTime)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <span>{getMethodIcon(record.method)}</span>
                            <span>{record.method.replace('_', ' ')}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>
                              {record.class.lecturer.firstName} {record.class.lecturer.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {record.confidence && (
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Confidence</p>
                          <p className="text-white font-medium">
                            {(record.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Previous
                    </Button>
                    
                    <span className="text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}