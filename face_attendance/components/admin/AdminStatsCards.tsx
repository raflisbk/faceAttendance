'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, Clock, TrendingUp, TrendingDown, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface AdminStatsCardsProps {
  stats: DashboardStats
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const cards = [
    {
      title: "Total Users",
      value: stats.users.total,
      description: `${stats.users.active} active, ${stats.users.pending} pending`,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      change: null
    },
    {
      title: "Active Classes",
      value: stats.classes.active,
      description: `${stats.classes.total} total classes`,
      icon: BookOpen,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      change: null
    },
    {
      title: "Today's Attendance",
      value: `${((stats.attendance.todayPresent / stats.attendance.todayTotal) * 100 || 0).toFixed(1)}%`,
      description: `${stats.attendance.todayPresent}/${stats.attendance.todayTotal} present`,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      change: stats.attendance.monthlyTrend
    },
    {
      title: "Face Profiles",
      value: stats.system.faceProfiles,
      description: "Enrolled profiles",
      icon: UserCheck,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      change: null
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                {card.title}
              </CardTitle>
              <div className={cn("rounded-lg p-2", card.bgColor)}>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">
                {card.value}
              </div>
              <div className="flex items-center text-xs text-slate-400">
                <span>{card.description}</span>
                {card.change !== null && (
                  <div className="ml-auto flex items-center">
                    {card.change > 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400 mr-1" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      card.change > 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}