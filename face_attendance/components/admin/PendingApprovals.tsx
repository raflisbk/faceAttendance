'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCheck, UserX, Clock, Eye } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'
import { useToastHelpers } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface PendingUser {
  id: string
  name: string
  email: string
  role: string
  registrationStep: number
  createdAt: string
  avatar?: string
}

export function PendingApprovals() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const toast = useToastHelpers()

  useEffect(() => {
    loadPendingUsers()
  }, [])

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true)
      const response = await ApiClient.get<PendingUser[]>('/api/admin/users/pending')
      if (response.data) {
        setPendingUsers(response.data)
      }
    } catch (error) {
      toast.error('Failed to load pending users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingIds(prev => new Set([...prev, userId]))

      await ApiClient.post(`/api/admin/users/${userId}/approval`, {
        action,
        reason: action === 'approve' ? 'Approved by admin' : 'Rejected by admin'
      })

      setPendingUsers(prev => prev.filter(user => user.id !== userId))
      toast.success(`User ${action}d successfully`)
    } catch (error) {
      toast.error(`Failed to ${action} user`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-500/20 text-blue-400'
      case 'LECTURER': return 'bg-green-500/20 text-green-400'
      case 'ADMIN': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Pending Approvals
        </CardTitle>
        <Badge variant="secondary" className="bg-slate-700 text-slate-200">
          {pendingUsers.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="w-6 h-6 text-slate-400" />
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No pending approvals
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingUsers.map((user) => {
              const isProcessing = processingIds.has(user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-slate-700 text-slate-200">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-white truncate">
                        {user.name}
                      </p>
                      <Badge className={cn("text-xs", getRoleColor(user.role))}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Step {user.registrationStep}/4 • {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {/* TODO: View details */}}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApproval(user.id, 'approve')}
                      disabled={isProcessing}
                      className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                    >
                      {isProcessing ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApproval(user.id, 'reject')}
                      disabled={isProcessing}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
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