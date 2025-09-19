'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  rate: number
}

interface ClassOverview {
  id: string
  name: string
  code: string
  totalStudents: number
  presentToday: number
  attendanceRate: number
  lastUpdated: Date
}

interface AttendanceOverviewProps {
  stats: AttendanceStats
  classes: ClassOverview[]
  period: 'today' | 'week' | 'month'
  onPeriodChange?: (period: 'today' | 'week' | 'month') => void
}

export function AttendanceOverview({
  stats,
  classes,
  period = 'today'
}: AttendanceOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500'
      case 'late':
        return 'bg-yellow-500'
      case 'absent':
        return 'bg-red-500'
      case 'excused':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    if (rate >= 70) return 'text-orange-600'
    return 'text-red-600'
  }

  const getAttendanceRateBackground = (rate: number) => {
    if (rate >= 90) return 'bg-green-50 border-green-200'
    if (rate >= 80) return 'bg-yellow-50 border-yellow-200'
    if (rate >= 70) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const formatPeriodTitle = (period: string) => {
    switch (period) {
      case 'today':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      default:
        return 'Today'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <p className="text-xs text-muted-foreground">
              Students present {formatPeriodTitle(period).toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-xs text-muted-foreground">
              Students late {formatPeriodTitle(period).toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <p className="text-xs text-muted-foreground">
              Students absent {formatPeriodTitle(period).toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Attendance Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Attendance Rate - {formatPeriodTitle(period)}
          </CardTitle>
          <CardDescription>
            Percentage of students attending classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getAttendanceRateColor(stats.rate)}`}>
                {stats.rate.toFixed(1)}%
              </span>
              <Badge variant={stats.rate >= 80 ? 'default' : 'destructive'}>
                {stats.rate >= 80 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
            <Progress value={stats.rate} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Class Attendance Breakdown
          </CardTitle>
          <CardDescription>
            Attendance status for each class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No classes found for the selected period</p>
              </div>
            ) : (
              classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className={`p-4 rounded-lg border ${getAttendanceRateBackground(classItem.attendanceRate)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{classItem.name}</h4>
                      <p className="text-sm text-muted-foreground">{classItem.code}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getAttendanceRateColor(classItem.attendanceRate)}`}>
                        {classItem.attendanceRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.presentToday}/{classItem.totalStudents} present
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={classItem.attendanceRate} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Last updated: {classItem.lastUpdated.toLocaleTimeString()}
                      </span>
                      <div className="flex items-center gap-1">
                        {classItem.attendanceRate >= 90 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : classItem.attendanceRate < 70 ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Distribution</CardTitle>
          <CardDescription>
            Breakdown of attendance statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Present', value: stats.present, color: 'bg-green-500', total: stats.total },
              { label: 'Late', value: stats.late, color: 'bg-yellow-500', total: stats.total },
              { label: 'Absent', value: stats.absent, color: 'bg-red-500', total: stats.total },
              { label: 'Excused', value: stats.excused, color: 'bg-blue-500', total: stats.total }
            ].map((item) => {
              const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0
              return (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-20">
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceOverview