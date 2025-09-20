// app/lecturer/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  QrCode,
  BarChart3,
  Download,
  RefreshCw,
  Plus,
  Eye,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { FormatUtils } from '@/lib/utils'
import { QRCodeGenerator } from '@/components/attendance/QRCodeGenerator'
import { ClassList } from '@/components/classes/ClassList'

interface LecturerStats {
  classes: {
    total: number
    active: number
    todayClasses: number
    totalStudents: number
  }
  attendance: {
    todayTotal: number
    todayPresent: number
    todayAbsent: number
    todayLate: number
    weeklyAverage: number
    monthlyTrend: number
  }
  upcomingClass?: {
    id: string
    name: string
    startTime: string
    endTime: string
    location: string
    enrolledStudents: number
    canGenerateQR: boolean
  }
}

interface TodayClass {
  id: string
  name: string
  code: string
  location: {
    name: string
    building: string
    wifiSSID: string
  }
  schedule: {
    startTime: string
    endTime: string
  }
  enrollment: {
    current: number
    capacity: number
  }
  attendance: {
    present: number
    absent: number
    late: number
    rate: number
  }
  status: 'UPCOMING' | 'IN_SESSION' | 'COMPLETED'
  canGenerateQR: boolean
  hasActiveQR: boolean
}

export default function LecturerDashboard() {
  const [stats, setStats] = useState<LecturerStats | null>(null)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [selectedClassForQR, setSelectedClassForQR] = useState<string | null>(null)
  
  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 2 minutes for real-time updates
    const interval = setInterval(loadDashboardData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError('')
      
      const [statsResponse, classesResponse] = await Promise.all([
        ApiClient.get<LecturerStats>('/api/lecturer/stats'),
        ApiClient.get<TodayClass[]>('/api/lecturer/today-classes')
      ])

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data)
      }

      if (classesResponse.success && classesResponse.data) {
        setTodayClasses(classesResponse.data)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load dashboard data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData(true)
  }

  const handleGenerateQR = (classId: string) => {
    setSelectedClassForQR(classId)
    setShowQRGenerator(true)
  }


  const handleExportAttendance = async (classId: string) => {
    try {
      const response = await fetch(`/api/lecturer/classes/${classId}/attendance/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_${classId}_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Attendance report exported successfully')
    } catch (error) {
      toast.error('Failed to export attendance report')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'text-blue-400 bg-blue-900/20 border-blue-800'
      case 'IN_SESSION':
        return 'text-green-400 bg-green-900/20 border-green-800'
      case 'COMPLETED':
        return 'text-slate-400 bg-slate-800/20 border-slate-700'
      default:
        return 'text-slate-400 bg-slate-800/20 border-slate-700'
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400'
    if (rate >= 60) return 'text-yellow-400'
    return 'text-red-400'
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, Prof. {user?.name?.split(' ')[0] || 'Lecturer'}!
            </h1>
            <p className="text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              onClick={() => window.location.href = '/lecturer/classes/create'}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </div>
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
                  My Classes
                </CardTitle>
                <BookOpen className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.classes.active}
                </div>
                <p className="text-xs text-slate-400">
                  {stats.classes.todayClasses} classes today
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.classes.totalStudents}
                </div>
                <p className="text-xs text-slate-400">
                  Across all classes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Today's Attendance
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {stats.attendance.todayPresent + stats.attendance.todayLate}
                </div>
                <p className="text-xs text-slate-400">
                  of {stats.attendance.todayTotal} expected
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Weekly Average
                </CardTitle>
                {stats.attendance.monthlyTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  getAttendanceColor(stats.attendance.weeklyAverage)
                )}>
                  {stats.attendance.weeklyAverage.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400">
                  {stats.attendance.monthlyTrend > 0 ? '+' : ''}{stats.attendance.monthlyTrend.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Today's Classes
            </TabsTrigger>
            <TabsTrigger 
              value="classes" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              All Classes
            </TabsTrigger>
            <TabsTrigger 
              value="attendance" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Attendance Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Today's Classes */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Today's Classes
                  </span>
                  <span className="text-sm font-normal text-slate-400">
                    {todayClasses.length} classes scheduled
                  </span>
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
                          getStatusColor(classItem.status)
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-white">
                                {classItem.name}
                              </h3>
                              <span className="text-sm text-slate-400">
                                ({classItem.code})
                              </span>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                getStatusColor(classItem.status)
                              )}>
                                {classItem.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                {FormatUtils.formatTime(classItem.schedule.startTime)} - {FormatUtils.formatTime(classItem.schedule.endTime)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                {classItem.location.name}, {classItem.location.building}
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2 text-slate-400" />
                                {classItem.enrollment.current} students enrolled
                              </div>
                            </div>

                            {/* Attendance Stats */}
                            <div className="mt-3 p-3 bg-slate-800/30 rounded">
                              <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-semibold text-green-400">
                                    {classItem.attendance.present}
                                  </div>
                                  <div className="text-xs text-slate-400">Present</div>
                                </div>
                                <div>
                                  <div className="text-lg font-semibold text-yellow-400">
                                    {classItem.attendance.late}
                                  </div>
                                  <div className="text-xs text-slate-400">Late</div>
                                </div>
                                <div>
                                  <div className="text-lg font-semibold text-red-400">
                                    {classItem.attendance.absent}
                                  </div>
                                  <div className="text-xs text-slate-400">Absent</div>
                                </div>
                                <div>
                                  <div className={cn(
                                    "text-lg font-semibold",
                                    getAttendanceColor(classItem.attendance.rate)
                                  )}>
                                    {classItem.attendance.rate.toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-slate-400">Rate</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2 ml-4">
                            {classItem.canGenerateQR && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateQR(classItem.id)}
                                className={cn(
                                  "bg-slate-700 hover:bg-slate-600 text-white",
                                  classItem.hasActiveQR && "bg-green-700 hover:bg-green-600"
                                )}
                              >
                                <QrCode className="w-4 h-4 mr-1" />
                                {classItem.hasActiveQR ? 'Update QR' : 'Generate QR'}
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = `/lecturer/classes/${classItem.id}`}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportAttendance(classItem.id)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Class Alert */}
            {stats?.upcomingClass && (
              <Alert className="bg-blue-900/50 border-blue-800 text-blue-200">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Next class:</strong> {stats.upcomingClass.name} at{' '}
                  {FormatUtils.formatTime(stats.upcomingClass.startTime)} in {stats.upcomingClass.location}
                  ({stats.upcomingClass.enrolledStudents} students enrolled)
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="classes">
            {user?.id && (
              <ClassList
                userRole="LECTURER"
                userId={user.id}
              />
            )}
          </TabsContent>

          <TabsContent value="attendance">
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <p>Attendance overview will be implemented</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* QR Code Generator Modal */}
        {showQRGenerator && selectedClassForQR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-slate-800 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Generate QR Code for Attendance</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQRGenerator(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 chalk-particles">
                <QRCodeGenerator
                  lecturerId={user?.id || ''}
                  userRole="LECTURER"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}