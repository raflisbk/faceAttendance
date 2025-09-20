// app/student/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  History,
  Home
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
    if (rate >= 80) return 'text-foreground'
    if (rate >= 60) return 'text-muted-foreground'
    return 'text-destructive'
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="w-4 h-4 text-foreground" />
      case 'LATE':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
      case 'ABSENT':
        return <XCircle className="w-4 h-4 text-destructive" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <LoadingSpinner className="w-8 h-8 text-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pixel-bg space-pixel-md">
      {/* Home Button */}
      <Link href="/" className="absolute top-pixel-md right-pixel-md z-50">
        <Button variant="outline" size="sm" className="btn-pixel gap-pixel-xs">
          <Home className="w-pixel h-pixel" />
          Home
        </Button>
      </Link>

      <div className="relative container-pixel">
        {/* Header */}
        <div className="space-pixel-lg">
          <h1 className="heading-pixel-1">
            Welcome, {user?.name}!
          </h1>
          <p className="text-pixel-small">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="space-pixel-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-pixel-small">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-pixel-md space-pixel-lg">
            <Card className="pixel-card hover-pixel">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-pixel">
                  Attendance Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("heading-pixel-3", getAttendanceColor(stats.attendanceRate))}>
                  {stats.attendanceRate.toFixed(1)}%
                </div>
                <p className="text-pixel-small">
                  {stats.presentCount} present of {stats.totalClasses} total
                </p>
              </CardContent>
            </Card>

            <Card className="pixel-card hover-pixel">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-pixel">
                  Today's Classes
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="heading-pixel-3">
                  {stats.todayClasses}
                </div>
                <p className="text-pixel-small">
                  {stats.upcomingClass ? 'Next: ' + stats.upcomingClass.name : 'No more classes today'}
                </p>
              </CardContent>
            </Card>

            <Card className="pixel-card hover-pixel">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-pixel">
                  Present Sessions
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-foreground" />
              </CardHeader>
              <CardContent>
                <div className="heading-pixel-3">
                  {stats.presentCount}
                </div>
                <p className="text-pixel-small">
                  {stats.lateCount} late arrivals
                </p>
              </CardContent>
            </Card>

            <Card className="pixel-card hover-pixel">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-pixel">
                  Absent Sessions
                </CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="heading-pixel-3 text-destructive">
                  {stats.absentCount}
                </div>
                <p className="text-pixel-small">
                  This semester
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-pixel-md space-pixel-lg">
          <div className="lg:col-span-2">
            <Card className="pixel-card hover-pixel">
              <CardHeader>
                <CardTitle className="heading-pixel-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Today's Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayClasses.length === 0 ? (
                  <div className="text-center space-pixel-lg">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto space-pixel-md" />
                    <p className="text-pixel">No classes scheduled for today</p>
                  </div>
                ) : (
                  <div className="flex-pixel-col">
                    {todayClasses.map((classItem) => (
                      <div
                        key={classItem.id}
                        className={cn(
                          "pixel-card transition-all",
                          classItem.isInSession
                            ? "bg-foreground text-background"
                            : "hover-pixel"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-pixel-xs margin-pixel-xs">
                              {getStatusIcon(classItem.attendance?.status)}
                              <h3 className="text-pixel">
                                {classItem.name}
                              </h3>
                              <span className="text-pixel-small">
                                ({classItem.code})
                              </span>
                            </div>
                            
                            <div className="flex-pixel-col text-pixel-small">
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                {classItem.lecturer.name}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                                {FormatUtils.formatTime(classItem.schedule.startTime)} - {FormatUtils.formatTime(classItem.schedule.endTime)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                                {classItem.location.name}, {classItem.location.building}
                              </div>
                              <div className="flex items-center">
                                <Wifi className="w-4 h-4 mr-2 text-muted-foreground" />
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
              <CardContent className="relative z-10 chalk-particles">
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