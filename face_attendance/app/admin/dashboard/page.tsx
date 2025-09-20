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
  RefreshCw,
  Palette,
  Sparkles,
  Camera,
  Crown
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
      <div className="min-h-screen bg-blackboard flex items-center justify-center relative overflow-hidden">
        {/* Artistic loading background */}
        <div className="absolute inset-0 bg-blackboard"></div>
        <div className="absolute inset-0 bg-chalk-dust opacity-20"></div>

        <div className="relative text-center">
          <div className="w-20 h-20 card-chalk flex items-center justify-center border-2 border-white/40 rounded-xl shadow-chalk mb-6 mx-auto">
            <LoadingSpinner className="w-10 h-10 text-white" />
          </div>
          <p className="text-white font-chalk text-xl animate-pulse">
            🎨 Preparing your artistic dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blackboard text-white relative overflow-hidden p-6">
      {/* Master's Studio Background */}
      <div className="absolute inset-0 bg-blackboard"></div>
      <div className="absolute inset-0 bg-blackboard-texture opacity-25"></div>
      <div className="absolute inset-0 bg-chalk-dust opacity-20"></div>
      <div className="absolute inset-0 bg-grid-chalk opacity-10"></div>

      {/* Floating Chalk Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: `${0.5 + Math.random() * 1.5}px`,
              height: `${0.5 + Math.random() * 1.5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.1 + Math.random() * 0.3
            }}
          />
        ))}
      </div>

      {/* Decorative Corner Elements */}
      <div className="absolute top-4 left-4 w-20 h-20 opacity-15">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M20,20 Q50,10 80,20 Q90,50 80,80 Q50,90 20,80 Q10,50 20,20"
                stroke="white" strokeWidth="2" fill="none" strokeDasharray="8,4"
                className="animate-pulse" />
        </svg>
      </div>
      <div className="absolute top-4 right-4 w-16 h-16 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="2"
                  fill="none" strokeDasharray="10,5" className="animate-spin"
                  style={{animationDuration: '20s'}} />
        </svg>
      </div>
      
      <div className="relative max-w-7xl mx-auto">
        {/* Master's Studio Header */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="flex items-center space-x-6">
            {/* Master's Crown Icon */}
            <div className="relative">
              <div className="w-16 h-16 card-chalk flex items-center justify-center border-2 border-white/40 rounded-xl shadow-chalk animate-chalk-glow">
                <Crown className="w-8 h-8 text-white" />
              </div>
              {/* Chalk dust around crown */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/60 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-white/40 rounded-full animate-pulse delay-500"></div>
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-chalk text-chalk-drawn mb-3 animate-chalk-write">
                🎨 Master's Studio
              </h1>
              <p className="text-white/80 font-chalk text-lg flex items-center">
                <Palette className="mr-2 w-5 h-5" />
                Command your artistic empire
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-chalk hover:scale-105 transition-all eraser-smudge"
            >
              <RefreshCw className={cn("w-5 h-5 mr-2", isRefreshing && "animate-spin")} />
              Refresh Canvas
            </Button>

            <Button
              onClick={handleExportReport}
              className="bg-white text-blackboard hover:bg-white/90 font-chalk px-6 py-3 border-2 border-white shadow-chalk hover:shadow-lg transition-all hover:scale-105"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Masterpiece
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8 bg-red-900/20 border-2 border-red-600/50 text-red-200 backdrop-blur-sm card-chalk">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <AlertDescription className="font-chalk">
              ⚠️ {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Artistic Tab Navigation */}
          <div className="relative">
            <div className="absolute -top-2 -left-2 -right-2 -bottom-2 border border-white/20 rounded-lg pointer-events-none"></div>
            <TabsList className="bg-white/5 border-2 border-white/30 p-2 backdrop-blur-sm card-chalk w-full">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:text-blackboard text-white font-chalk px-6 py-3 transition-all hover:scale-105 data-[state=active]:shadow-chalk"
              >
                <Activity className="w-5 h-5 mr-2" />
                🎨 Gallery
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-white data-[state=active]:text-blackboard text-white font-chalk px-6 py-3 transition-all hover:scale-105 data-[state=active]:shadow-chalk"
              >
                <Users className="w-5 h-5 mr-2" />
                👥 Artists
              </TabsTrigger>
              <TabsTrigger
                value="classes"
                className="data-[state=active]:bg-white data-[state=active]:text-blackboard text-white font-chalk px-6 py-3 transition-all hover:scale-105 data-[state=active]:shadow-chalk"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                📚 Studios
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-white data-[state=active]:text-blackboard text-white font-chalk px-6 py-3 transition-all hover:scale-105 data-[state=active]:shadow-chalk"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                📈 Insights
              </TabsTrigger>
            </TabsList>
          </div>

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

            {/* Today's Artistic Attendance Canvas */}
            {stats && (
              <Card className="card-chalk backdrop-blur-lg border-2 border-white/30 shadow-blackboard relative overflow-hidden">
                {/* Artistic corner decorations */}
                <div className="absolute top-4 left-4 text-2xl opacity-60">
                  🕰️
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 opacity-30">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="2"
                            fill="none" strokeDasharray="6,6" className="animate-spin"
                            style={{animationDuration: '8s'}} />
                  </svg>
                </div>

                <CardHeader>
                  <CardTitle className="text-white font-chalk text-2xl flex items-center animate-chalk-glow">
                    <Clock className="w-6 h-6 mr-3" />
                    🎨 Today's Artistic Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 card-chalk rounded-lg hover:scale-105 transition-transform">
                      <div className="text-3xl font-bold text-white mb-2 font-chalk animate-chalk-glow">
                        {stats.attendance.todayTotal}
                      </div>
                      <div className="text-white/70 font-chalk">🎨 Total Canvases</div>
                    </div>

                    <div className="text-center p-4 card-chalk rounded-lg hover:scale-105 transition-transform">
                      <div className="text-3xl font-bold text-green-300 mb-2 font-chalk animate-chalk-glow">
                        {stats.attendance.todayPresent}
                      </div>
                      <div className="text-white/70 font-chalk">✅ Artists Present</div>
                    </div>

                    <div className="text-center p-4 card-chalk rounded-lg hover:scale-105 transition-transform">
                      <div className="text-3xl font-bold text-yellow-300 mb-2 font-chalk animate-chalk-glow">
                        {stats.attendance.todayLate}
                      </div>
                      <div className="text-white/70 font-chalk">⏰ Late Arrivals</div>
                    </div>

                    <div className="text-center p-4 card-chalk rounded-lg hover:scale-105 transition-transform">
                      <div className="text-3xl font-bold text-red-300 mb-2 font-chalk animate-chalk-glow">
                        {stats.attendance.todayAbsent}
                      </div>
                      <div className="text-white/70 font-chalk">❌ Missing Artists</div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/30">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 font-chalk text-lg">Weekly Studio Average</span>
                      <div className="flex items-center space-x-3">
                        {stats.attendance.monthlyTrend > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-300 animate-pulse" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-300 animate-pulse" />
                        )}
                        <span className="text-white font-chalk font-bold text-xl">
                          {stats.attendance.weeklyAverage.toFixed(1)}%
                        </span>
                        <span className={cn(
                          "font-chalk text-lg",
                          stats.attendance.monthlyTrend > 0 ? "text-green-300" : "text-red-300"
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
                <Card className="card-chalk backdrop-blur-lg border-2 border-white/30 shadow-blackboard relative overflow-hidden">
                  {/* Artistic decorations */}
                  <div className="absolute top-4 left-4 text-2xl opacity-60">
                    🎯
                  </div>
                  <div className="absolute bottom-4 right-4 w-10 h-10 opacity-30">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M25,25 L75,25 L75,75 L25,75 Z" stroke="white" strokeWidth="2"
                            fill="none" strokeDasharray="8,4" className="animate-pulse" />
                    </svg>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-white font-chalk text-2xl flex items-center animate-chalk-glow">
                      <Activity className="w-6 h-6 mr-3" />
                      🎨 Studio Health Monitor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="p-6 rounded-lg card-chalk border border-white/20 hover:scale-105 transition-transform group">
                        <div className="flex items-center justify-between mb-4">
                          <MapPin className="w-6 h-6 text-white/70 group-hover:animate-pulse" />
                          <CheckCircle className="w-5 h-5 text-green-300 animate-pulse" />
                        </div>
                        <div className="text-2xl font-bold text-white font-chalk mb-2">
                          {stats.system.totalLocations}
                        </div>
                        <div className="text-white/70 font-chalk">🗺️ Studio Locations</div>
                      </div>

                      <div className="p-6 rounded-lg card-chalk border border-white/20 hover:scale-105 transition-transform group">
                        <div className="flex items-center justify-between mb-4">
                          <Wifi className="w-6 h-6 text-white/70 group-hover:animate-pulse" />
                          <CheckCircle className="w-5 h-5 text-green-300 animate-pulse" />
                        </div>
                        <div className="text-2xl font-bold text-white font-chalk mb-2">
                          {stats.system.activeWifiNetworks}
                        </div>
                        <div className="text-white/70 font-chalk">📶 WiFi Networks</div>
                      </div>

                      <div className="p-6 rounded-lg card-chalk border border-white/20 hover:scale-105 transition-transform group">
                        <div className="flex items-center justify-between mb-4">
                          <UserCheck className="w-6 h-6 text-white/70 group-hover:animate-pulse" />
                          <CheckCircle className="w-5 h-5 text-green-300 animate-pulse" />
                        </div>
                        <div className="text-2xl font-bold text-white font-chalk mb-2">
                          {stats.system.faceProfiles}
                        </div>
                        <div className="text-white/70 font-chalk">🎨 Artist Profiles</div>
                      </div>

                      <div className="p-6 rounded-lg card-chalk border border-white/20 hover:scale-105 transition-transform group">
                        <div className="flex items-center justify-between mb-4">
                          <Settings className="w-6 h-6 text-white/70 group-hover:animate-pulse" />
                          <CheckCircle className="w-5 h-5 text-green-300 animate-pulse" />
                        </div>
                        <div className="text-2xl font-bold text-white font-chalk mb-2">
                          {stats.system.qrSessions}
                        </div>
                        <div className="text-white/70 font-chalk">📱 Active QR Canvas</div>
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