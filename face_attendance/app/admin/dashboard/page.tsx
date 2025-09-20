// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  RefreshCw,
  Palette,
  Sparkles,
  Camera,
  Crown,
  Home
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
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-pixel-lg h-pixel-lg pixel-card flex items-center justify-center space-pixel-md mx-auto">
            <LoadingSpinner className="w-pixel-md h-pixel-md text-foreground" />
          </div>
          <p className="text-pixel animate-pixel-blink">
            Loading admin dashboard...
          </p>
        </div>
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

      {/* Pixel Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-foreground animate-pixel-blink"
            style={{
              width: '2px',
              height: '2px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3
            }}
          />
        ))}
      </div>

      {/* Pixel Corner Decorations */}
      <div className="absolute top-pixel-sm left-pixel-sm w-pixel-lg h-pixel-lg bg-foreground opacity-20"></div>
      <div className="absolute top-pixel-sm right-pixel-sm w-pixel-md h-pixel-md bg-foreground opacity-15"></div>

      <div className="relative container-pixel">
        {/* Admin Header */}
        <div className="flex items-center justify-between space-pixel-lg">
          <div className="flex items-center gap-pixel-md">
            {/* Admin Icon */}
            <div className="w-pixel-lg h-pixel-lg pixel-card flex items-center justify-center hover-pixel">
              <Crown className="w-pixel-md h-pixel-md text-foreground" />
            </div>

            <div>
              <h1 className="heading-pixel-1">
                Admin Dashboard
              </h1>
              <p className="text-pixel">
                System management center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-pixel-sm">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-pixel"
            >
              <RefreshCw className={cn("w-pixel h-pixel mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>

            <Button
              onClick={handleExportReport}
              className="btn-pixel-secondary"
            >
              <Download className="w-pixel h-pixel mr-2" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="space-pixel-md">
            <AlertTriangle className="w-pixel h-pixel" />
            <AlertDescription className="text-pixel-small">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-pixel-lg">
          {/* Pixel Tab Navigation */}
          <div className="pixel-card">
            <TabsList className="pixel-tabs w-full">
              <TabsTrigger
                value="overview"
                className="pixel-tab"
              >
                <Activity className="w-pixel h-pixel mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="pixel-tab"
              >
                <Users className="w-pixel h-pixel mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="classes"
                className="pixel-tab"
              >
                <BookOpen className="w-pixel h-pixel mr-2" />
                Classes
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="pixel-tab"
              >
                <BarChart3 className="w-pixel h-pixel mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-pixel-lg">
            {/* Stats Overview */}
            {stats && <AdminStatsCards stats={stats} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-pixel-md">
              {/* Pending Approvals */}
              <div className="lg:col-span-1">
                <PendingApprovals />
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <RecentActivity activities={recentActivity} />
              </div>
            </div>

            {/* Today's Attendance Summary */}
            {stats && (
              <Card className="pixel-card hover-pixel">
                <CardHeader>
                  <CardTitle className="heading-pixel-3 flex items-center">
                    <Clock className="w-pixel-md h-pixel-md mr-3" />
                    Today's Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-pixel-md">
                    <div className="text-center space-pixel-sm">
                      <div className="heading-pixel-2">
                        {stats.attendance.todayTotal}
                      </div>
                      <div className="text-pixel-small">Total Sessions</div>
                    </div>

                    <div className="text-center space-pixel-sm">
                      <div className="heading-pixel-2 text-foreground">
                        {stats.attendance.todayPresent}
                      </div>
                      <div className="text-pixel-small">Present</div>
                    </div>

                    <div className="text-center space-pixel-sm">
                      <div className="heading-pixel-2">
                        {stats.attendance.todayLate}
                      </div>
                      <div className="text-pixel-small">Late</div>
                    </div>

                    <div className="text-center space-pixel-sm">
                      <div className="heading-pixel-2">
                        {stats.attendance.todayAbsent}
                      </div>
                      <div className="text-pixel-small">Absent</div>
                    </div>
                  </div>

                  <div className="margin-pixel-md border-t border-border space-pixel-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-pixel">Weekly Average</span>
                      <div className="flex items-center gap-pixel-xs">
                        {stats.attendance.monthlyTrend > 0 ? (
                          <TrendingUp className="w-pixel h-pixel" />
                        ) : (
                          <TrendingDown className="w-pixel h-pixel" />
                        )}
                        <span className="text-pixel">
                          {stats.attendance.weeklyAverage.toFixed(1)}%
                        </span>
                        <span className="text-pixel-small">
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
              <Card className="card-chalk backdrop-blur-lg border-2 border-white/30 shadow-blackboard relative overflow-hidden">
                {/* Artistic decorations */}
                <div className="absolute top-4 left-4 text-2xl opacity-60">
                  📈
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 opacity-30">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M20,80 L40,60 L60,40 L80,20" stroke="white" strokeWidth="2"
                          fill="none" strokeDasharray="6,4" className="animate-pulse" />
                  </svg>
                </div>

                <CardHeader>
                  <CardTitle className="text-white font-chalk text-2xl flex items-center justify-between animate-chalk-glow">
                    <span className="flex items-center">
                      <BarChart3 className="w-6 h-6 mr-3" />
                      🎨 Artistic Analytics Canvas
                    </span>
                    <Button className="btn-chalk text-sm hover:scale-105 transition-all">
                      View Masterpiece
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <AttendanceChart />
                </CardContent>
              </Card>

              {/* System Health */}
              {stats && (
                <Card className="pixel-card hover-pixel">
                  <CardHeader>
                    <CardTitle className="heading-pixel-3 flex items-center">
                      <Activity className="w-pixel-md h-pixel-md mr-3" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-pixel-md">
                      <div className="pixel-card space-pixel-sm hover-pixel">
                        <div className="flex items-center justify-between margin-pixel-xs">
                          <MapPin className="w-pixel h-pixel" />
                          <CheckCircle className="w-pixel h-pixel text-foreground" />
                        </div>
                        <div className="heading-pixel-2 margin-pixel-xs">
                          {stats.system.totalLocations}
                        </div>
                        <div className="text-pixel-small">Locations</div>
                      </div>

                      <div className="pixel-card space-pixel-sm hover-pixel">
                        <div className="flex items-center justify-between margin-pixel-xs">
                          <Wifi className="w-pixel h-pixel" />
                          <CheckCircle className="w-pixel h-pixel text-foreground" />
                        </div>
                        <div className="heading-pixel-2 margin-pixel-xs">
                          {stats.system.activeWifiNetworks}
                        </div>
                        <div className="text-pixel-small">WiFi Networks</div>
                      </div>

                      <div className="pixel-card space-pixel-sm hover-pixel">
                        <div className="flex items-center justify-between margin-pixel-xs">
                          <UserCheck className="w-pixel h-pixel" />
                          <CheckCircle className="w-pixel h-pixel text-foreground" />
                        </div>
                        <div className="heading-pixel-2 margin-pixel-xs">
                          {stats.system.faceProfiles}
                        </div>
                        <div className="text-pixel-small">Face Profiles</div>
                      </div>

                      <div className="pixel-card space-pixel-sm hover-pixel">
                        <div className="flex items-center justify-between margin-pixel-xs">
                          <Settings className="w-pixel h-pixel" />
                          <CheckCircle className="w-pixel h-pixel text-foreground" />
                        </div>
                        <div className="heading-pixel-2 margin-pixel-xs">
                          {stats.system.qrSessions}
                        </div>
                        <div className="text-pixel-small">QR Sessions</div>
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