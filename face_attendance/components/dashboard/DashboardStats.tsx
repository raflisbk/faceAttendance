// components/dashboard/DashboardStats.tsx - Part 1: Imports & Types
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Camera,
  MapPin,
  BarChart3,
  Activity,
  Target,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface DashboardStats {
  overview: {
    totalUsers: number
    totalClasses: number
    totalSessions: number
    averageAttendance: number
    todayAttendance: number
    activeUsers: number
  }
  trends: {
    userGrowth: number
    attendanceChange: number
    classGrowth: number
    sessionGrowth: number
  }
  todayStats: {
    totalCheckIns: number
    faceRecognitionSuccess: number
    qrCodeCheckIns: number
    manualCheckIns: number
    avgCheckInTime: number
  }
  systemHealth: {
    faceApiStatus: boolean
    databaseStatus: boolean
    cacheStatus: boolean
    overallHealth: number
    lastChecked: string
  }
  recentActivity: {
    newRegistrations: number
    pendingApprovals: number
    activeSessions: number
    systemAlerts: number
  }
  topPerformers: {
    bestAttendanceClass: {
      name: string
      rate: number
    }
    mostActiveUser: {
      name: string
      checkIns: number
    }
    bestLecturer: {
      name: string
      avgAttendance: number
    }
  }
}

interface DashboardStatsProps {
  userRole: 'ADMIN' | 'LECTURER' | 'STUDENT'
  userId?: string
  timeRange?: 'TODAY' | 'WEEK' | 'MONTH' | 'SEMESTER'
  className?: string
}

// components/dashboard/DashboardStats.tsx - Part 2: Component Logic
export const DashboardStats: React.FC<DashboardStatsProps> = ({
  userRole,
  userId,
  timeRange = 'TODAY',
  className
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  const toast = useToastHelpers()

  useEffect(() => {
    loadDashboardStats()
    
    // Auto refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardStats(true)
    }, 300000)

    return () => clearInterval(interval)
  }, [userRole, userId, timeRange])

  const loadDashboardStats = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true)
      
      const params = new URLSearchParams({
        timeRange,
        ...(userRole === 'LECTURER' && userId && { lecturerId: userId }),
        ...(userRole === 'STUDENT' && userId && { studentId: userId })
      })

      const response = await fetch(`/api/dashboard/stats?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setLastUpdated(new Date())
      } else {
        if (!silent) toast.error('Failed to load dashboard statistics')
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      if (!silent) toast.error('Failed to load dashboard statistics')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-slate-500" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-slate-600 dark:text-slate-400'
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600 dark:text-green-400'
    if (health >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getHealthIcon = (health: number) => {
    if (health >= 90) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (health >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    return <AlertTriangle className="w-5 h-5 text-red-500" />
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." className="py-12" />
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Failed to load dashboard statistics
        </p>
      </div>
    )
  }

// components/dashboard/DashboardStats.tsx - Part 3: Main UI Cards
  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* First Card - System Health/Total Sessions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {userRole === 'ADMIN' ? 'System Health' : 'Total Sessions'}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {userRole === 'ADMIN' 
                    ? `${stats.systemHealth.overallHealth}%`
                    : stats.overview.totalSessions
                  }
                </p>
                <div className="flex items-center mt-2">
                  {userRole === 'ADMIN' 
                    ? getHealthIcon(stats.systemHealth.overallHealth)
                    : getTrendIcon(stats.trends.sessionGrowth)
                  }
                  <span className={cn("text-sm font-medium ml-1", 
                    userRole === 'ADMIN' 
                      ? getHealthColor(stats.systemHealth.overallHealth)
                      : getTrendColor(stats.trends.sessionGrowth)
                  )}>
                    {userRole === 'ADMIN'
                      ? 'All systems'
                      : `${stats.trends.sessionGrowth > 0 ? '+' : ''}${stats.trends.sessionGrowth}%`
                    }
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                {userRole === 'ADMIN' ? (
                  <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Second Card - Users/Classes */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {userRole === 'STUDENT' ? 'Your Classes' : 'Total Users'}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {userRole === 'STUDENT' ? stats.overview.totalClasses : stats.overview.totalUsers}
                </p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(userRole === 'STUDENT' ? stats.trends.classGrowth : stats.trends.userGrowth)}
                  <span className={cn("text-sm font-medium ml-1", getTrendColor(userRole === 'STUDENT' ? stats.trends.classGrowth : stats.trends.userGrowth))}>
                    {userRole === 'STUDENT' 
                      ? `${stats.trends.classGrowth > 0 ? '+' : ''}${stats.trends.classGrowth}%`
                      : `${stats.trends.userGrowth > 0 ? '+' : ''}${stats.trends.userGrowth}%`
                    }
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                {userRole === 'STUDENT' ? (
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third Card - Attendance Rate/Total Classes */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {userRole === 'STUDENT' ? 'Attendance Rate' : 'Total Classes'}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {userRole === 'STUDENT' 
                    ? `${Math.round(stats.overview.averageAttendance * 100)}%`
                    : stats.overview.totalClasses
                  }
                </p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(userRole === 'STUDENT' ? stats.trends.attendanceChange : stats.trends.classGrowth)}
                  <span className={cn("text-sm font-medium ml-1", getTrendColor(userRole === 'STUDENT' ? stats.trends.attendanceChange : stats.trends.classGrowth))}>
                    {userRole === 'STUDENT'
                      ? `${stats.trends.attendanceChange > 0 ? '+' : ''}${stats.trends.attendanceChange}%`
                      : `${stats.trends.classGrowth > 0 ? '+' : ''}${stats.trends.classGrowth}%`
                    }
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                {userRole === 'STUDENT' ? (
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fourth Card - Today's Attendance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Today's Attendance
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.overview.todayAttendance}
                </p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 ml-1">
                    {stats.todayStats.totalCheckIns} check-ins
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      // components/dashboard/DashboardStats.tsx - Part 4: Activity Cards & Component Close

      {/* Today's Activity (Admin/Lecturer only) */}
      {userRole !== 'STUDENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Today's Check-in Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Face Recognition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.faceRecognitionSuccess / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.faceRecognitionSuccess}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-green-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded"></div>
                    </div>
                    <span className="font-medium">QR Code</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.qrCodeCheckIns / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.qrCodeCheckIns}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-yellow-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                    </div>
                    <span className="font-medium">Manual</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.manualCheckIns / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.manualCheckIns}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Average check-in time
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {stats.todayStats.avgCheckInTime.toFixed(1)}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      New Registrations
                    </span>
                  </div>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.recentActivity.newRegistrations}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      Pending Approvals
                    </span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.recentActivity.pendingApprovals}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      Active Sessions
                    </span>
                  </div>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {stats.recentActivity.activeSessions}
                  </span>
                </div>

                {stats.recentActivity.systemAlerts > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">
                        System Alerts
                      </span>
                    </div>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {stats.recentActivity.systemAlerts}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health (Admin only) */}
      {userRole === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.faceApiStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <Camera className={cn(
                    "w-6 h-6",
                    stats.systemHealth.faceApiStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Face Recognition API
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.faceApiStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.faceApiStatus ? 'Operational' : 'Issues Detected'}
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.databaseStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <Activity className={cn(
                    "w-6 h-6",
                    stats.systemHealth.databaseStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Database
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.databaseStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.databaseStatus ? 'Connected' : 'Connection Issues'}
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.cacheStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <BarChart3 className={cn(
                    "w-6 h-6",
                    stats.systemHealth.cacheStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Cache System
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.cacheStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.cacheStatus ? 'Active' : 'Degraded'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Last health check
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {DateUtils.getRelativeTime(stats.systemHealth.lastChecked)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {userRole === 'STUDENT' ? 'Your Performance' : 'Top Performers'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                {userRole === 'STUDENT' ? 'Your Best Class' : 'Best Attendance Class'}
              </h3>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.topPerformers.bestAttendanceClass.name}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {Math.round(stats.topPerformers.bestAttendanceClass.rate * 100)}% attendance
              </p>
            </div>

            {userRole !== 'STUDENT' && (
              <>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Most Active User
                  </h3>
// components/dashboard/DashboardStats.tsx - Part 4: Activity Cards & Component Close

      {/* Today's Activity (Admin/Lecturer only) */}
      {userRole !== 'STUDENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Today's Check-in Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Face Recognition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.faceRecognitionSuccess / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.faceRecognitionSuccess}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-green-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded"></div>
                    </div>
                    <span className="font-medium">QR Code</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.qrCodeCheckIns / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.qrCodeCheckIns}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-yellow-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                    </div>
                    <span className="font-medium">Manual</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.todayStats.totalCheckIns > 0 ? (stats.todayStats.manualCheckIns / stats.todayStats.totalCheckIns) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.todayStats.manualCheckIns}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Average check-in time
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {stats.todayStats.avgCheckInTime.toFixed(1)}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      New Registrations
                    </span>
                  </div>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.recentActivity.newRegistrations}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      Pending Approvals
                    </span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.recentActivity.pendingApprovals}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      Active Sessions
                    </span>
                  </div>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {stats.recentActivity.activeSessions}
                  </span>
                </div>

                {stats.recentActivity.systemAlerts > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">
                        System Alerts
                      </span>
                    </div>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {stats.recentActivity.systemAlerts}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health (Admin only) */}
      {userRole === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.faceApiStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <Camera className={cn(
                    "w-6 h-6",
                    stats.systemHealth.faceApiStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Face Recognition API
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.faceApiStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.faceApiStatus ? 'Operational' : 'Issues Detected'}
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.databaseStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <Activity className={cn(
                    "w-6 h-6",
                    stats.systemHealth.databaseStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Database
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.databaseStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.databaseStatus ? 'Connected' : 'Connection Issues'}
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                  stats.systemHealth.cacheStatus 
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                )}>
                  <BarChart3 className={cn(
                    "w-6 h-6",
                    stats.systemHealth.cacheStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Cache System
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  stats.systemHealth.cacheStatus
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {stats.systemHealth.cacheStatus ? 'Active' : 'Degraded'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Last health check
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {DateUtils.getRelativeTime(stats.systemHealth.lastChecked)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            {userRole === 'STUDENT' ? 'Your Performance' : 'Top Performers'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                {userRole === 'STUDENT' ? 'Your Best Class' : 'Best Attendance Class'}
              </h3>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.topPerformers.bestAttendanceClass.name}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {Math.round(stats.topPerformers.bestAttendanceClass.rate * 100)}% attendance
              </p>
            </div>

            {userRole !== 'STUDENT' && (
              <>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Most Active User
                  </h3>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.topPerformers.mostActiveUser.name}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {stats.topPerformers.mostActiveUser.checkIns} check-ins
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                    Best Lecturer
                  </h3>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.topPerformers.bestLecturer.name}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {Math.round(stats.topPerformers.bestLecturer.avgAttendance * 100)}% avg attendance
                  </p>
                </div>
              </>
            )}

            {userRole === 'STUDENT' && (
              <>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Total Check-ins
                  </h3>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.topPerformers.mostActiveUser.checkIns}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    This {timeRange.toLowerCase()}
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                    Attendance Goal
                  </h3>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.overview.averageAttendance >= 0.8 ? 'Achieved!' : 'In Progress'}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Target: 80%
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated Info */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        Last updated: {FormatUtils.formatDateTime(lastUpdated)} • Auto-refreshes every 5 minutes
      </div>
    </div>
  )
}