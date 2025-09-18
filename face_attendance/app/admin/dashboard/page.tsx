// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  MapPin,
  Wifi,
  UserCheck,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { DateUtils } from '@/lib/utils'
import { AdminStatsCards } from '@/components/admin/AdminStatsCards'
import { PendingApprovals } from '@/components/admin/PendingApprovals'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { AttendanceChart } from '@/components/charts/AttendanceChart'
import { UserManagement } from '@/components/admin/UserManagement'
import { ClassManagement } from '@/components/admin/ClassManagement'

interface DashboardStats {
  users: {
    total: number
    active: number
    pending: number
    suspended: number
    byRole: {
      admins: number
      lecturers: number
      students: number
    }
  }
  classes: {
    total: number
    active: number
    inactive: number
    averageEnrollment: number
  }
  attendance: {
    todayTotal: number
    todayPresent: number
    todayAbsent: number
    todayLate: number
    weeklyAverage: number
    monthlyTrend: number
  }
  system: {
    totalLocations: number
    activeWifiNetworks: number
    faceProfiles: number
    qrSessions: number
  }
}

interface RecentActivityItem {
  id: string
  type: 'USER_REGISTRATION' | 'ATTENDANCE_CHECKED' | 'CLASS_CREATED' | 'FACE_ENROLLED' | 'SYSTEM_ALERT'
  title: string
  description: string
  user?: {
    name: string
    role: string
  }
  timestamp: string
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState('overview')
  
  const {} = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    loadDashboardData()
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
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
      
      const [statsResponse, activityResponse] = await Promise.all([
        apiClient.get('/api/admin/dashboard/stats'),
        apiClient.get('/api/admin/dashboard/activity')
      ])

      setStats(statsResponse.data as DashboardStats)
      setRecentActivity(activityResponse.data as RecentActivityItem[])
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

  const handleExportReport = async () => {
    try {
      const response = await apiClient.get('/api/admin/reports/export')
      
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `admin_report_${DateUtils.formatDate(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-400">
              System overview and management
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
              onClick={handleExportReport}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-800 text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="classes" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Classes
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            {stats && <AdminStatsCards stats={stats} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pending Approvals */}
              <div className="lg:col-span-1">
                <PendingApprovals />
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <RecentActivity activities={recentActivity} />
              </div>
            </div>

            {/* Today's Attendance Overview */}
            {stats && (
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Today's Attendance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {stats.attendance.todayTotal}
                      </div>
                      <div className="text-sm text-slate-400">Total Sessions</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {stats.attendance.todayPresent}
                      </div>
                      <div className="text-sm text-slate-400">Present</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">
                        {stats.attendance.todayLate}
                      </div>
                      <div className="text-sm text-slate-400">Late</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400 mb-1">
                        {stats.attendance.todayAbsent}
                      </div>
                      <div className="text-sm text-slate-400">Absent</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Weekly Average Attendance</span>
                      <div className="flex items-center">
                        {stats.attendance.monthlyTrend > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                        )}
                        <span className="text-white font-medium">
                          {stats.attendance.weeklyAverage.toFixed(1)}%
                        </span>
                        <span className={cn(
                          "ml-2 text-xs",
                          stats.attendance.monthlyTrend > 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {stats.attendance.monthlyTrend > 0 ? '+' : ''}{stats.attendance.monthlyTrend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="classes">
            <ClassManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Attendance Analytics */}
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Attendance Analytics
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      View Details
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AttendanceChart />
                </CardContent>
              </Card>

              {/* System Health */}
              {stats && (
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <MapPin className="w-5 h-5 text-slate-400" />
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {stats.system.totalLocations}
                        </div>
                        <div className="text-sm text-slate-400">Total Locations</div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <Wifi className="w-5 h-5 text-slate-400" />
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {stats.system.activeWifiNetworks}
                        </div>
                        <div className="text-sm text-slate-400">WiFi Networks</div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <UserCheck className="w-5 h-5 text-slate-400" />
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {stats.system.faceProfiles}
                        </div>
                        <div className="text-sm text-slate-400">Face Profiles</div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <Settings className="w-5 h-5 text-slate-400" />
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {stats.system.qrSessions}
                        </div>
                        <div className="text-sm text-slate-400">Active QR Sessions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}