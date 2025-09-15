// components/ui/student-dashboard.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  MapPin, 
  User, 
  QrCode,
  Target,
  CheckCircle,
  AlertCircle,
  Trophy,
  BarChart3,
  GraduationCap,
  Bell,
  Settings,
  Camera,
  Wifi,
  Battery,
  Signal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface StudentInfo {
  id: string
  name: string
  studentId: string
  email: string
  semester: number
  major: string
  gpa: number
  profileImage?: string
  enrollmentDate: Date
  graduationYear: number
}

interface ClassSchedule {
  id: string
  name: string
  code: string
  lecturerName: string
  time: string
  endTime: string
  location: string
  room: string
  building: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  attendanceStatus?: 'present' | 'absent' | 'late' | null
  isCheckInAvailable: boolean
  classType: 'lecture' | 'lab' | 'seminar' | 'exam'
  credits: number
}

interface AttendanceRecord {
  id: string
  classId: string
  className: string
  date: Date
  status: 'present' | 'absent' | 'late'
  checkInTime?: Date
  method: 'face' | 'qr' | 'manual'
  location: string
  confidence?: number
}

interface AttendanceStats {
  totalClasses: number
  attendedClasses: number
  attendanceRate: number
  lateCount: number
  upcomingClasses: number
  streakDays: number
  missedClasses: number
  onTimeRate: number
  monthlyTrend: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'attendance' | 'academic' | 'participation'
  unlockedAt: Date
  progress?: number
  maxProgress?: number
}

interface StudentDashboardProps {
  studentId: string
  className?: string
}

export function StudentDashboard({ studentId, className }: StudentDashboardProps) {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [todaySchedule, setTodaySchedule] = useState<ClassSchedule[]>([])
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history' | 'achievements'>('overview')
  const [currentTime, setCurrentTime] = useState(new Date())

  const toast = useToastHelpers()

  useEffect(() => {
    loadStudentData()
    
    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    // Refresh data every 5 minutes
    const dataInterval = setInterval(() => {
      loadStudentData(true)
    }, 300000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(dataInterval)
    }
  }, [studentId])

  const loadStudentData = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true)

      const [studentRes, scheduleRes, attendanceRes, statsRes, achievementsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/students/${studentId}/schedule/today`),
        fetch(`/api/students/${studentId}/attendance/recent`),
        fetch(`/api/students/${studentId}/stats`),
        fetch(`/api/students/${studentId}/achievements`)
      ])

      if (studentRes.ok) {
        const studentData = await studentRes.json()
        setStudentInfo({
          ...studentData,
          enrollmentDate: new Date(studentData.enrollmentDate)
        })
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setTodaySchedule(scheduleData.schedule)
      }

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json()
        setRecentAttendance(attendanceData.records.map((record: any) => ({
          ...record,
          date: new Date(record.date),
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined
        })))
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setAttendanceStats(statsData.stats)
      }

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json()
        setAchievements(achievementsData.achievements.map((achievement: any) => ({
          ...achievement,
          unlockedAt: new Date(achievement.unlockedAt)
        })))
      }

    } catch (error) {
      console.error('Error loading student data:', error)
      if (!silent) toast.error('Failed to load dashboard data')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleCheckIn = async (classId: string) => {
    try {
      const response = await fetch(`/api/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          classId, 
          studentId, 
          method: 'qr' 
        })
      })

      if (response.ok) {
        toast.success('Successfully checked in!')
        loadStudentData(true)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Check-in failed')
      }
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error('Check-in failed')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 dark:text-green-400'
      case 'absent': return 'text-red-600 dark:text-red-400'
      case 'late': return 'text-yellow-600 dark:text-yellow-400'
      case 'upcoming': return 'text-blue-600 dark:text-blue-400'
      case 'ongoing': return 'text-orange-600 dark:text-orange-400'
      case 'completed': return 'text-slate-600 dark:text-slate-400'
      case 'cancelled': return 'text-red-600 dark:text-red-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      'present': 'present',
      'absent': 'absent', 
      'late': 'late',
      'upcoming': 'info',
      'ongoing': 'warning',
      'completed': 'secondary',
      'cancelled': 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getClassTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen className="w-4 h-4" />
      case 'lab': return <Settings className="w-4 h-4" />
      case 'seminar': return <User className="w-4 h-4" />
      case 'exam': return <GraduationCap className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const nextClass = todaySchedule.find(c => c.status === 'upcoming')
  const ongoingClass = todaySchedule.find(c => c.status === 'ongoing')

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading your dashboard..." className="py-12" />
  }

  if (!studentInfo || !attendanceStats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Failed to load student dashboard
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              {studentInfo.profileImage ? (
                <img 
                  src={studentInfo.profileImage} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Welcome back, {studentInfo.name.split(' ')[0]}!
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {studentInfo.studentId} • {studentInfo.major} • Semester {studentInfo.semester}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                GPA: {studentInfo.gpa.toFixed(2)} • Class of {studentInfo.graduationYear}
              </p>
            </div>
            
            <div className="text-right hidden md:block">
              <p className="text-sm text-slate-600 dark:text-slate-400">Current Time</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Class Alert */}
      {ongoingClass && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Class in Session: {ongoingClass.name}
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  {ongoingClass.location} • Until {ongoingClass.endTime}
                </p>
              </div>
              {ongoingClass.isCheckInAvailable && !ongoingClass.attendanceStatus && (
                <Button 
                  onClick={() => handleCheckIn(ongoingClass.id)}
                  variant="chalk"
                  size="sm"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats.attendanceRate}%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Attendance Rate</p>
                <p className={cn(
                  "text-xs font-medium",
                  attendanceStats.monthlyTrend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {attendanceStats.monthlyTrend > 0 ? '+' : ''}{attendanceStats.monthlyTrend}% this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats.attendedClasses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Classes Attended</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  of {attendanceStats.totalClasses} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats.onTimeRate}%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">On-Time Rate</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {attendanceStats.lateCount} late arrivals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats.streakDays}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Day Streak</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keep it up!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'schedule', label: 'Today\'s Schedule', icon: Calendar },
          { key: 'history', label: 'Attendance History', icon: BookOpen },
          { key: 'achievements', label: 'Achievements', icon: Trophy }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === key
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Attendance</span>
                  <span>{attendanceStats.attendanceRate}%</span>
                </div>
                <Progress value={attendanceStats.attendanceRate} className="h-3" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Target: 80%</span>
                  <span className={cn(
                    attendanceStats.attendanceRate >= 80 ? "text-green-600" : "text-red-600"
                  )}>
                    {attendanceStats.attendanceRate >= 80 ? "Goal Achieved!" : `${80 - attendanceStats.attendanceRate}% to go`}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {attendanceStats.attendedClasses}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {attendanceStats.missedClasses}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Missed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Class */}
          {nextClass ? (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-300">Next Class</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getClassTypeIcon(nextClass.classType)}
                    <h3 className="font-semibold text-lg">{nextClass.name}</h3>
                    <Badge variant="info">{nextClass.classType}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{nextClass.code}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Lecturer: {nextClass.lecturerName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Credits: {nextClass.credits}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{nextClass.time} - {nextClass.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{nextClass.building} - {nextClass.room}</span>
                  </div>
                </div>
                
                {nextClass.isCheckInAvailable && (
                  <Button 
                    onClick={() => handleCheckIn(nextClass.id)}
                    variant="chalk" 
                    className="w-full"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Check In Now
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Next Class</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No more classes today</p>
                  <p className="text-sm">Enjoy your free time!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No classes scheduled for today</p>
                <p className="text-sm">Enjoy your free day!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySchedule.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      schedule.status === 'ongoing' && "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20",
                      schedule.status === 'upcoming' && "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20",
                      schedule.status === 'completed' && "border-slate-200 dark:border-slate-700",
                      schedule.status === 'cancelled' && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getClassTypeIcon(schedule.classType)}
                        <h3 className="font-medium">{schedule.name}</h3>
                        {getStatusBadge(schedule.status)}
                        {schedule.attendanceStatus && getStatusBadge(schedule.attendanceStatus)}
                        <Badge variant="secondary">{schedule.credits} credits</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{schedule.time} - {schedule.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{schedule.building} - {schedule.room}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {schedule.lecturerName}
                      </p>
                    </div>
                    
                    {schedule.isCheckInAvailable && schedule.status === 'upcoming' && !schedule.attendanceStatus && (
                      <Button
                        onClick={() => handleCheckIn(schedule.id)}
                        variant="chalk"
                        size="sm"
                      >
                        Check In
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No attendance records yet</p>
                <p className="text-sm">Your attendance history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{record.className}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{DateUtils.formatDate(record.date)}</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{record.location}</span>
                        </div>
                        {record.checkInTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{DateUtils.formatTime(record.checkInTime)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {record.method === 'face' && <Camera className="w-3 h-3" />}
                          {record.method === 'qr' && <QrCode className="w-3 h-3" />}
                          {record.method === 'manual' && <User className="w-3 h-3" />}
                          <span className="capitalize">{record.method}</span>
                        </div>
                        {record.confidence && (
                          <span className="text-xs">
                            {Math.round(record.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No achievements yet</p>
              <p className="text-sm">Keep attending classes to unlock achievements!</p>
            </div>
          ) : (
            achievements.map((achievement) => (
              <Card key={achievement.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{achievement.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {achievement.description}
                      </p>
                    </div>
                    
                    {achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{achievement.progress}/{achievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={
                        achievement.category === 'attendance' ? 'chalkBlue' :
                        achievement.category === 'academic' ? 'chalkGreen' :
                        'chalkPurple'
                      }>
                        {achievement.category}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unlocked on {DateUtils.formatDate(achievement.unlockedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Weekly Performance Chart */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Weekly Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                // Mock data - in real implementation, this would come from API
                const attendanceRate = Math.max(0, Math.min(100, 70 + Math.random() * 30))
                const hasClass = index < 5 // Weekdays only for this example
                
                return (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-sm font-medium w-20">{day}</span>
                    <div className="flex-1 mx-4">
                      {hasClass ? (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                          <div 
                            className={cn(
                              "h-3 rounded-full transition-all duration-500",
                              attendanceRate >= 80 ? "bg-green-500" :
                              attendanceRate >= 60 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 flex items-center justify-center">
                          <span className="text-xs text-slate-500">No class</span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {hasClass ? `${Math.round(attendanceRate)}%` : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Wifi className="w-4 h-4" />
                <span>Connected</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Signal className="w-4 h-4" />
                <span>Strong Signal</span>
              </div>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Battery className="w-4 h-4" />
                <span>Face Recognition Ready</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Last updated: {DateUtils.getRelativeTime(new Date())}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}