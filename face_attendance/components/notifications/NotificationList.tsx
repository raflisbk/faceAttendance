// components/ui/notification-list.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Clock, 
  User, 
  Calendar, 
  Camera,
  Shield,
  Settings,
  Trash2,
  MarkAsRead,
  Filter,
  Search,
  ChevronDown,
  Dot
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'attendance' 
  | 'system' 
  | 'security'
  | 'approval'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  isRead: boolean
  timestamp: Date
  userId?: string
  userName?: string
  metadata?: {
    classId?: string
    className?: string
    action?: string
    link?: string
    attendanceId?: string
    systemComponent?: string
  }
  actions?: Array<{
    id: string
    label: string
    variant: 'primary' | 'secondary' | 'danger'
    action: () => void
  }>
}

interface NotificationListProps {
  userId?: string
  userRole?: 'ADMIN' | 'LECTURER' | 'STUDENT'
  maxNotifications?: number
  showFilters?: boolean
  enableRealTime?: boolean
  onNotificationClick?: (notification: Notification) => void
  onNotificationAction?: (notificationId: string, actionId: string) => void
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
  onDeleteNotification?: (notificationId: string) => void
  className?: string
}

export function NotificationList({
  userId,
  userRole = 'STUDENT',
  maxNotifications = 50,
  showFilters = true,
  enableRealTime = true,
  onNotificationClick,
  onNotificationAction,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  className
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set())

  const toast = useToastHelpers()

  useEffect(() => {
    loadNotifications()
    
    let interval: NodeJS.Timeout
    if (enableRealTime) {
      // Poll for new notifications every 30 seconds
      interval = setInterval(loadNotifications, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [userId, userRole, enableRealTime])

  useEffect(() => {
    filterNotifications()
  }, [notifications, searchQuery, typeFilter, priorityFilter, readFilter])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        limit: maxNotifications.toString(),
        ...(userId && { userId }),
        ...(userRole && { userRole })
      })

      const response = await fetch(`/api/notifications?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        })))
      } else {
        toast.error('Failed to load notifications')
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const filterNotifications = () => {
    let filtered = [...notifications]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(notif => 
        notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.userName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notif => notif.type === typeFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(notif => notif.priority === priorityFilter)
    }

    // Read status filter
    if (readFilter !== 'all') {
      filtered = filtered.filter(notif => 
        readFilter === 'read' ? notif.isRead : !notif.isRead
      )
    }

    // Sort by timestamp (newest first) and priority
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    setFilteredNotifications(filtered)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        )
        onMarkAsRead?.(notificationId)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        )
        onMarkAllAsRead?.()
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        )
        onDeleteNotification?.(notificationId)
        toast.success('Notification deleted')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    onNotificationClick?.(notification)
  }

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId)
      } else {
        newSet.add(notificationId)
      }
      return newSet
    })
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'error': return <AlertTriangle className="w-5 h-5" />
      case 'attendance': return <Calendar className="w-5 h-5" />
      case 'system': return <Settings className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'approval': return <User className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getNotificationColor = (type: NotificationType, priority: NotificationPriority) => {
    if (priority === 'urgent') return 'text-red-600 dark:text-red-400'
    
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      case 'attendance': return 'text-blue-600 dark:text-blue-400'
      case 'system': return 'text-purple-600 dark:text-purple-400'
      case 'security': return 'text-orange-600 dark:text-orange-400'
      case 'approval': return 'text-indigo-600 dark:text-indigo-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getNotificationBgColor = (type: NotificationType, priority: NotificationPriority) => {
    if (priority === 'urgent') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'attendance': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'system': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
      case 'security': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'approval': return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
      default: return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  }

  const getPriorityBadge = (priority: NotificationPriority) => {
    const variants = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-slate-500 text-white'
    }
    
    return (
      <Badge className={cn('text-xs', variants[priority])}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading notifications..." className="py-12" />
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="chalkOutline"
                size="sm"
              >
                <MarkAsRead className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={readFilter} onValueChange={(value: any) => setReadFilter(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No notifications found</p>
              <p className="text-sm">
                {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You\'re all caught up!'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id)
              const hasLongMessage = notification.message.length > 100
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer",
                    getNotificationBgColor(notification.type, notification.priority),
                    !notification.isRead && "ring-2 ring-blue-200 dark:ring-blue-800"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-2 right-2">
                      <Dot className="w-6 h-6 text-blue-600 dark:text-blue-400 fill-current" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 p-2 rounded-full",
                      getNotificationColor(notification.type, notification.priority)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className={cn(
                            "font-medium text-sm",
                            !notification.isRead && "font-semibold"
                          )}>
                            {notification.title}
                          </h3>
                          
                          {notification.userName && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              From: {notification.userName}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getPriorityBadge(notification.priority)}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {DateUtils.getRelativeTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="mt-2">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {hasLongMessage && !isExpanded 
                            ? `${notification.message.substring(0, 100)}...`
                            : notification.message
                          }
                        </p>
                        
                        {hasLongMessage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(notification.id)
                            }}
                            className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ChevronDown className={cn(
                              "w-3 h-3 transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>

                      {/* Metadata */}
                      {notification.metadata && (
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          {notification.metadata.className && (
                            <span>Class: {notification.metadata.className}</span>
                          )}
                          {notification.metadata.systemComponent && (
                            <span>Component: {notification.metadata.systemComponent}</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          {notification.actions.map((action) => (
                            <Button
                              key={action.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                action.action()
                                onNotificationAction?.(notification.id, action.id)
                              }}
                              variant={action.variant === 'primary' ? 'chalk' : 'chalkOutline'}
                              size="sm"
                              className={cn(
                                action.variant === 'danger' && 
                                "text-red-600 hover:text-red-700 dark:text-red-400"
                              )}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Mark as read"
                        >
                          <MarkAsRead className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotification(notification.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Load More */}
        {filteredNotifications.length >= maxNotifications && (
          <div className="text-center pt-4">
            <Button variant="chalkOutline" onClick={loadNotifications}>
              Load More Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}