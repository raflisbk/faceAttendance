// components/ui/student-dashboard.tsx
'use client'

import React, { useState } from 'react'
import { Calendar, BookOpen, TrendingUp, Clock, MapPin, User, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AttendanceStatistics } from './attendance-statistics'
import { cn } from '@/lib/utils'

interface ClassSchedule {
  id: string
  name: string
  code: string
  lecturerName: string
  time: string
  location: string
  room: string
  status: 'upcoming' | 'ongoing' | 'completed'
  attendanceStatus?: 'present' | 'absent' | 'late' | null
}

interface AttendanceRecord {
  id: string
  className: string
  date: Date
  status: 'present' | 'absent' | 'late'
  checkInTime?: Date
  location: string
}

interface StudentDashboardProps {
  studentInfo: {
    name: string
    studentId: string
    semester: number
    gpa: number
    profileImage?: string
  }
  todaySchedule: ClassSchedule[]
  recentAttendance: AttendanceRecord[]
  attendanceStats: {
    totalClasses: number
    attendedClasses: number
    attendanceRate: number
    lateCount: number
    upcomingClasses: number
  }
  onCheckIn?: (classId: string) => void
  className?: string
}

export function StudentDashboard({
  studentInfo,
  todaySchedule,
  recentAttendance,
  attendanceStats,
  onCheckIn,
  className
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history'>('overview')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 dark:text-green-400'
      case 'absent': return 'text-red-600 dark:text-red-400'
      case 'late': return 'text-yellow-600 dark:text-yellow-400'
      case 'upcoming': return 'text-blue-600 dark:text-blue-400'
      case 'ongoing': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'present': 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      'absent': 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      'late': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
      'upcoming': 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      'ongoing': 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
      'completed': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    }
    
    return (
      <span className={cn('px-2 py-1 text-xs rounded-full', colors[status as keyof typeof colors])}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const upcomingClass = todaySchedule.find(c => c.status === 'upcoming')

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
                Welcome back, {studentInfo.name}!
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Student ID: {studentInfo.studentId} • Semester {studentInfo.semester} • GPA: {studentInfo.gpa.toFixed(2)}
              </p>
            </div>
            
            {upcomingClass && (
              <div className="text-right">
                <p className="text-sm text-slate-600 dark:text-slate-400">Next Class</p>
                <p className="font-medium">{upcomingClass.name}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{upcomingClass.time}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats.upcomingClasses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Upcoming Classes</p>
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
          { key: 'history', label: 'Attendance History', icon: BookOpen }
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
                <Progress value={attendanceStats.attendanceRate} className="h-2" />
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
                    {attendanceStats.totalClasses - attendanceStats.attendedClasses}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Class */}
          {upcomingClass && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-300">Next Class</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{upcomingClass.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{upcomingClass.code}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Lecturer: {upcomingClass.lecturerName}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{upcomingClass.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{upcomingClass.location}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => onCheckIn?.(upcomingClass.id)}
                  variant="chalk" 
                  className="w-full"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Check In Now
                </Button>
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
                      schedule.status === 'completed' && "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{schedule.name}</h3>
                        {getStatusBadge(schedule.status)}
                        {schedule.attendanceStatus && getStatusBadge(schedule.attendanceStatus)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{schedule.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{schedule.location} - {schedule.room}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {schedule.lecturerName}
                      </p>
                    </div>
                    
                    {schedule.status === 'upcoming' && (
                      <Button
                        onClick={() => onCheckIn?.(schedule.id)}
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
                    <div>
                      <h4 className="font-medium">{record.className}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{new Date(record.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{record.location}</span>
                        </div>
                        {record.checkInTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(record.checkInTime).toLocaleTimeString()}</span>
                          </div>
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
    </div>
  )
}

// components/ui/lecturer-dashboard.tsx
'use client'

import React, { useState } from 'react'
import { Users, BookOpen, TrendingUp, Calendar, Clock, QrCode, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QRCodeGenerator } from './qr-code-generator'
import { cn } from '@/lib/utils'

interface ClassStats {
  id: string
  name: string
  code: string
  totalStudents: number
  presentToday: number
  attendanceRate: number
  lastSession: Date
  nextSession: Date
  location: string
}

interface StudentAttendance {
  studentId: string
  studentName: string
  email: string
  attendanceRate: number
  lastAttended: Date
  status: 'active' | 'at-risk' | 'critical'
}

interface LecturerDashboardProps {
  lecturerInfo: {
    name: string
    staffId: string
    department: string
    profileImage?: string
  }
  classes: ClassStats[]
  recentActivity: Array<{
    id: string
    type: 'attendance' | 'late' | 'absent'
    studentName: string
    className: string
    timestamp: Date
  }>
  upcomingClasses: Array<{
    id: string
    name: string
    time: string
    location: string
    expectedStudents: number
  }>
  onGenerateQR?: (classId: string) => void
  onViewClassDetails?: (classId: string) => void
  className?: string
}

export function LecturerDashboard({
  lecturerInfo,
  classes,
  recentActivity,
  upcomingClasses,
  onGenerateQR,
  onViewClassDetails,
  className
}: LecturerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'activity'>('overview')
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)

  const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0)
  const avgAttendanceRate = classes.length > 0 
    ? classes.reduce((sum, cls) => sum + cls.attendanceRate, 0) / classes.length 
    : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400'
      case 'at-risk': return 'text-yellow-600 dark:text-yellow-400'
      case 'critical': return 'text-red-600 dark:text-red-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400'
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const nextClass = upcomingClasses[0]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              {lecturerInfo.profileImage ? (
                <img 
                  src={lecturerInfo.profileImage} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Welcome, Dr. {lecturerInfo.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Staff ID: {lecturerInfo.staffId} • {lecturerInfo.department}
              </p>
            </div>
            
            {nextClass && (
              <div className="text-right">
                <p className="text-sm text-slate-600 dark:text-slate-400">Next Class</p>
                <p className="font-medium">{nextClass.name}</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">{nextClass.time}</p>
                <Button 
                  onClick={() => {
                    setSelectedClassId(nextClass.id)
                    setShowQRGenerator(true)
                  }}
                  variant="chalkOutline" 
                  size="sm"
                  className="mt-2"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classes.length}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgAttendanceRate.toFixed(1)}%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Avg Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingClasses.length}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Today's Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'classes', label: 'My Classes', icon: BookOpen },
          { key: 'activity', label: 'Recent Activity', icon: BarChart3 }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === key
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
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
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No classes scheduled today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{cls.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{cls.time}</span>
                          </div>
                          <span>{cls.location}</span>
                          <span>{cls.expectedStudents} students</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => {
                          setSelectedClassId(cls.id)
                          setShowQRGenerator(true)
                        }}
                        variant="chalkOutline"
                        size="sm"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        activity.type === 'attendance' && "bg-green-500",
                        activity.type === 'late' && "bg-yellow-500",
                        activity.type === 'absent' && "bg-red-500"
                      )} />
                      
                      <div className="flex-1">
                        <p className="text-sm">
                          <strong>{activity.studentName}</strong> {activity.type} - {activity.className}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{cls.code}</p>
                  </div>
                  <Button
                    onClick={() => onViewClassDetails?.(cls.id)}
                    variant="chalkOutline"
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                    <p className="text-xl font-bold">{cls.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Present Today</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {cls.presentToday}
                    </p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Attendance Rate</span>
                    <span className={getAttendanceColor(cls.attendanceRate)}>
                      {cls.attendanceRate}%
                    </span>
                  </div>
                  <Progress value={cls.attendanceRate} className="h-2" />
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p>Location: {cls.location}</p>
                  <p>Next Session: {new Date(cls.nextSession).toLocaleString()}</p>
                </div>
                
                <Button
                  onClick={() => {
                    setSelectedClassId(cls.id)
                    setShowQRGenerator(true)
                  }}
                  variant="chalk"
                  className="w-full"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate Attendance QR
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    activity.type === 'attendance' && "bg-green-500",
                    activity.type === 'late' && "bg-yellow-500",
                    activity.type === 'absent' && "bg-red-500"
                  )} />
                  
                  <div className="flex-1">
                    <p className="font-medium">
                      {activity.studentName} - {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {activity.className}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Generator Modal */}
      {showQRGenerator && selectedClassId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Generate Attendance QR Code</h3>
            <QRCodeGenerator
              classId={selectedClassId}
              onClose={() => {
                setShowQRGenerator(false)
                setSelectedClassId(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
                <p className="text-2xl font-bold">{attendanceStats.attendanceRate}%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Attendance Rate</p>
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
                <p className="text-2xl font-bold">{attendanceStats.lateCount}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Late Arrivals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div></div>