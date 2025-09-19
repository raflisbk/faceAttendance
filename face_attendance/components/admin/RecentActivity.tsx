'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Activity,
  UserPlus,
  CheckCircle,
  BookOpen,
  Users,
  AlertTriangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface RecentActivityProps {
  activities: RecentActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'USER_REGISTRATION': return UserPlus
      case 'ATTENDANCE_CHECKED': return CheckCircle
      case 'CLASS_CREATED': return BookOpen
      case 'FACE_ENROLLED': return Users
      case 'SYSTEM_ALERT': return AlertTriangle
      default: return Info
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-400 bg-green-500/20'
      case 'WARNING': return 'text-yellow-400 bg-yellow-500/20'
      case 'ERROR': return 'text-red-400 bg-red-500/20'
      case 'INFO': return 'text-blue-400 bg-blue-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-500/20 text-blue-400'
      case 'LECTURER': return 'bg-green-500/20 text-green-400'
      case 'ADMIN': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <div className={cn(
                    "rounded-lg p-2 flex-shrink-0",
                    getStatusColor(activity.status)
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mt-1">
                      {activity.description}
                    </p>

                    {activity.user && (
                      <div className="flex items-center mt-2 space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                            {getInitials(activity.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-400">
                          {activity.user.name}
                        </span>
                        <Badge className={cn("text-xs", getRoleColor(activity.user.role))}>
                          {activity.user.role}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}