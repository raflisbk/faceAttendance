// app/student/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Camera,
  QrCode,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  MapPin,
  Wifi,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { FaceCapture } from '@/components/face/FaceCapture'
import { QRScanner } from '@/components/attendance/QRScanner'
import { useAuthStore } from '@/store/auth-store'
import { FormatUtils } from '@/lib/utils'

interface DashboardStats {
  totalClasses: number
  attendanceRate: number
  presentCount: number
  absentCount: number
  lateCount: number
  todayClasses: number
  upcomingClass?: {
    id: string
    name: string
    startTime: string
    location: string
    canCheckIn: boolean
  }
}

interface TodayClass {
  id: string
  name: string
  code: string
  lecturer: {
    name: string
  }
  location: {
    name: string
    building: string
    wifiSSID: string
  }
  schedule: {
    startTime: string
    endTime: string
  }
  attendance?: {
    status: string
    checkInTime: string
  }
  canCheckIn: boolean
  isInSession: boolean
}

export default function StudentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCheckIn, setActiveCheckIn] = useState<string | null>(null)
  const [checkInMethod, setCheckInMethod] = useState<'face' | 'qr' | null>(null)
  const [error, setError] = useState<string>('')
  
  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const [statsResponse, classesResponse] = await Promise.all([
        ApiClient.get<DashboardStats>('/api/student/stats'),
        ApiClient.get<TodayClass[]>('/api/student/today-classes')
      ])

      if (statsResponse.data) {
        setStats(statsResponse.data)
      }
      if (classesResponse.data) {
        setTodayClasses(classesResponse.data)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load dashboard data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckInStart = (classId: string, method: 'face' | 'qr') => {
    setActiveCheckIn(classId)
    setCheckInMethod(method)
  }

  const handleCheckInComplete = async (classId: string, data: any) => {
    try {
      const response = await ApiClient.post('/api/attendance/check-in', {
        classId,
        ...data
      })

      if (response.success) {
        toast.success('Check-in successful!')
        setActiveCheckIn(null)
        setCheckInMethod(null)
        await loadDashboardData() // Refresh data
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Check-in failed'
      toast.error(errorMessage)
    }
  }

  const handleCheckInCancel = () => {
    setActiveCheckIn(null)
    setCheckInMethod(null)
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400'
    if (rate >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'LATE':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'ABSENT':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner className="w-8 h-8 text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-800 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Attendance Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", getAttendanceColor(stats.attendanceRate))}>
                  {stats.attendanceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400">
                  {stats.presentCount} present of {stats.totalClasses} total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Today's Classes
                </CardTitle>
                <Calendar className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.todayClasses}
                </div>
                <p className="text-xs text-slate-400">
                  {stats.upcomingClass ? 'Next: ' + stats.upcomingClass.name : 'No more classes today'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Present Sessions
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {stats.presentCount}
                </div>
                <p className="text-xs text-slate-400">
                  {stats.lateCount} late arrivals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Absent Sessions
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">
                  {stats.absentCount}
                </div>
                <p className="text-xs text-slate-400">
                  This semester
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Today's Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No classes scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayClasses.map((classItem) => (
                      <div
                        key={classItem.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          classItem.isInSession
                            ? "bg-green-900/20 border-green-800"
                            : "bg-slate-800/50 border-slate-700"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getStatusIcon(classItem.attendance?.status)}
                              <h3 className="font-semibold text-white">
                                {classItem.name}
                              </h3>
                              <span className="text-sm text-slate-400">
                                ({classItem.code})
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-sm text-slate-300">
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2 text-slate-400" />
                                {classItem.lecturer.name}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                {FormatUtils.formatTime(classItem.schedule.startTime)} - {FormatUtils.formatTime(classItem.schedule.endTime)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                {classItem.location.name}, {classItem.location.building}
                              </div>
                              <div className="flex items-center">
                                <Wifi className="w-4 h-4 mr-2 text-slate-400" />
                                {classItem.location.wifiSSID}
                              </div>
                            </div>

                            {classItem.attendance && (
                              <div className="mt-2 text-sm">
                                <span className="text-slate-400">Checked in at: </span>
                                <span className="text-white">
                                  {FormatUtils.formatTime(classItem.attendance.checkInTime)}
                                </span>
                                <span className={cn(
                                  "ml-2 px-2 py-1 rounded text-xs font-medium",
                                  classItem.attendance.status === 'PRESENT' && "bg-green-900/50 text-green-300",
                                  classItem.attendance.status === 'LATE' && "bg-yellow-900/50 text-yellow-300",
                                  classItem.attendance.status === 'ABSENT' && "bg-red-900/50 text-red-300"
                                )}>
                                  {classItem.attendance.status}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Check-in Buttons */}
                          {classItem.canCheckIn && !classItem.attendance && (
                            <div className="flex space-x-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleCheckInStart(classItem.id, 'face')}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                              >
                                <Camera className="w-4 h-4 mr-1" />
                                Face Check-in
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckInStart(classItem.id, 'qr')}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                              >
                                <QrCode className="w-4 h-4 mr-1" />
                                QR Code
                              </Button>
                            </div>
                          )}

                          {!classItem.canCheckIn && !classItem.attendance && (
                            <div className="text-sm text-slate-500 ml-4">
                              {classItem.isInSession ? 'Check-in period ended' : 'Not yet time for check-in'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white justify-start"
                  onClick={() => window.location.href = '/student/attendance/history'}
                >
                  <History className="w-4 h-4 mr-2" />
                  View Attendance History
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white justify-start"
                  onClick={() => window.location.href = '/student/classes'}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  My Classes
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white justify-start"
                  onClick={() => window.location.href = '/student/profile'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white justify-start"
                  onClick={() => window.location.href = '/student/reports'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Check-in Modal */}
        {activeCheckIn && checkInMethod && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-slate-800 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>
                    {checkInMethod === 'face' ? 'Face Recognition Check-in' : 'QR Code Check-in'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCheckInCancel}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkInMethod === 'face' ? (
                  <FaceCapture
                    onCapture={(data) => handleCheckInComplete(activeCheckIn, { imageData: data })}
                    onError={(error) => {
                      toast.error(error)
                      handleCheckInCancel()
                    }}
                    width={640}
                    height={480}
                    showPreview={true}
                  />
                ) : (
                  <QRScanner
                    onScan={(data) => handleCheckInComplete(activeCheckIn, { qrCode: data })}
                    onError={(error) => {
                      toast.error(error)
                      handleCheckInCancel()
                    }}
                    onClose={handleCheckInCancel}
                    isActive={true}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}