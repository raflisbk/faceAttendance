import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Trash2,
  MarkAsUnread,
  Filter,
  Search,
  RefreshCw,
  Archive,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info' | 'system'
  priority: 'high' | 'medium' | 'low'
  read: boolean
  archived: boolean
  createdAt: string
  readAt?: string
  actionUrl?: string
  metadata?: {
    userId?: string
    classId?: string
    attendanceId?: string
    [key: string]: any
  }
}

interface NotificationListProps {
  userId: string
  userRole: 'ADMIN' | 'LECTURER' | 'STUDENT'
  className?: string
}

export const NotificationList: React.FC<NotificationListProps> = ({
  userId,
  userRole,
  className
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterRead, setFilterRead] = useState<string>('ALL')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())

  const toast = useToastHelpers()
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => {
    loadNotifications()
  }, [userId])

  useEffect(() => {
    filterNotifications()
  }, [notifications, searchTerm, filterType, filterRead])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
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
    let filtered = notifications.filter(n => !n.archived)

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'ALL') {
      filtered = filtered.filter(notification => notification.type === filterType)
    }

    // Read status filter
    if (filterRead === 'READ') {
      filtered = filtered.filter(notification => notification.read)
    } else if (filterRead === 'UNREAD') {
      filtered = filtered.filter(notification => !notification.read)
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      // First by read status (unread first)
      if (a.read !== b.read) {
        return a.read ? 1 : -1
      }
      
      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      
      // Finally by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    setFilteredNotifications(filtered)
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notificationIds.includes(notification.id)
              ? { ...notification, read: true, readAt: new Date().toISOString() }
              : notification
          )
        )
        toast.success(`${notificationIds.length} notification(s) marked as read`)
      } else {
        toast.error('Failed to mark notifications as read')
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }

  const markAsUnread = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notificationIds.includes(notification.id)
              ? { ...notification, read: false, readAt: undefined }
              : notification
          )
        )
        toast.success(`${notificationIds.length} notification(s) marked as unread`)
      } else {
        toast.error('Failed to mark notifications as unread')
      }
    } catch (error) {
      console.error('Error marking notifications as unread:', error)
      toast.error('Failed to mark notifications as unread')
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    showConfirm({
      title: 'Delete Notifications',
      description: `Are you sure you want to delete ${notificationIds.length} notification(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/notifications/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationIds })
          })

          if (response.ok) {
            setNotifications(prev =>
              prev.filter(notification => !notificationIds.includes(notification.id))
            )
            setSelectedNotifications(new Set())
            toast.success(`${notificationIds.length} notification(s) deleted`)
          } else {
            toast.error('Failed to delete notifications')
          }
        } catch (error) {
          console.error('Error deleting notifications:', error)
          toast.error('Failed to delete notifications')
        }
      }
    })
  }

  const archiveNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notificationIds.includes(notification.id)
              ? { ...notification, archived: true }
              : notification
          )
        )
        setSelectedNotifications(new Set())
        toast.success(`${notificationIds.length} notification(s) archived`)
      } else {
        toast.error('Failed to archive notifications')
      }
    } catch (error) {
      console.error('Error archiving notifications:', error)
      toast