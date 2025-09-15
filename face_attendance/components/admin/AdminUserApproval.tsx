import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  IdCard,
  FileText,
  Camera,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface PendingUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'STUDENT' | 'LECTURER'
  studentId?: string
  employeeId?: string
  department: string
  registrationStep: number
  createdAt: string
  documents: {
    type: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    fileUrl: string
    verifiedAt?: string
  }[]
  faceProfile: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    qualityScore: number
    images: string[]
    enrolledAt: string
  }
  lastActivity: string
}

interface AdminUserApprovalProps {
  className?: string
}

export const AdminUserApproval: React.FC<AdminUserApprovalProps> = ({ className }) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<PendingUser[]>([])
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'LECTURER'>('ALL')
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toast = useToastHelpers()
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  // Load pending users
  useEffect(() => {
    loadPendingUsers()
  }, [])

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = pendingUsers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.studentId && user.studentId.includes(searchTerm)) ||
        (user.employeeId && user.employeeId.includes(searchTerm))
      )
    }

    // Role filter
    if (filterRole !== 'ALL') {
      filtered = filtered.filter(user => user.role === filterRole)
    }

    // Department filter
    if (filterDepartment !== 'ALL') {
      filtered = filtered.filter(user => user.department === filterDepartment)
    }

    setFilteredUsers(filtered)
  }, [pendingUsers, searchTerm, filterRole, filterDepartment])

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/users/pending')
      
      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data.users || [])
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(data.users.map((u: PendingUser) => u.department))]
        setDepartments(uniqueDepartments)
      } else {
        toast.error('Failed to load pending users')
      }
    } catch (error) {
      console.error('Error loading pending users:', error)
      toast.error('Failed to load pending users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveUser = async (userId: string) => {
    showConfirm({
      title: 'Approve User Registration',
      description: 'Are you sure you want to approve this user? They will gain access to the system.',
      confirmText: 'Approve',
      variant: 'default',
      onConfirm: async () => {
        await processUserApproval(userId, 'APPROVED')
      }
    })
  }

  const handleRejectUser = (user: PendingUser) => {
    setSelectedUser(user)
    setShowRejectDialog(true)
    setRejectReason('')
  }

  const handleRejectConfirm = async () => {
    if (!selectedUser || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setIsSubmitting(true)
    try {
      await processUserApproval(selectedUser.id, 'REJECTED', rejectReason)
      setShowRejectDialog(false)
      setSelectedUser(null)
      setRejectReason('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const processUserApproval = async (userId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      })

      if (response.ok) {
        toast.success(
          `User ${status.toLowerCase()} successfully`,
          status === 'APPROVED' ? 'User can now access the system' : 'User has been notified'
        )
        
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(u => u.id !== userId))
      } else {
        const error = await response.json()
        toast.error(error.message || `Failed to ${status.toLowerCase()} user`)
      }
    } catch (error) {
      console.error('Error processing approval:', error)
      toast.error(`Failed to ${status.toLowerCase()} user`)
    }
  }

  const handleBulkApprove = () => {
    if (filteredUsers.length === 0) {
      toast.warning('No users to approve')
      return
    }

    showConfirm({
      title: 'Bulk Approve Users',
      description: `Are you sure you want to approve all ${filteredUsers.length} filtered users? This action cannot be undone.`,
      confirmText: `Approve ${filteredUsers.length} Users`,
      variant: 'warning',
      onConfirm: async () => {
        const userIds = filteredUsers.map(u => u.id)
        await processBulkApproval(userIds, 'APPROVED')
      }
    })
  }

  const processBulkApproval = async (userIds: string[], status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/admin/users/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, status })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(
          `${result.successful} users ${status.toLowerCase()} successfully`,
          result.failed > 0 ? `${result.failed} users failed` : undefined
        )
        
        // Remove approved users from pending list
        setPendingUsers(prev => prev.filter(u => !userIds.includes(u.id)))
      } else {
        const error = await response.json()
        toast.error(error.message || 'Bulk approval failed')
      }
    } catch (error) {
      console.error('Error in bulk approval:', error)
      toast.error('Bulk approval failed')
    }
  }

  const exportPendingUsers = () => {
    const csvData = filteredUsers.map(user => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Department: user.department,
      'Student/Employee ID': user.studentId || user.employeeId || '',
      'Registration Date': FormatUtils.formatDate(user.createdAt),
      'Face Quality Score': user.faceProfile.qualityScore,
      'Documents Status': user.documents.map(d => `${d.type}: ${d.status}`).join('; ')
    }))

    // Convert to CSV and download
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pending-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Pending users exported successfully')
  }

  const getRoleColor = (role: string) => {
    return role === 'LECTURER' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
  }

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading pending users..." className="py-12" />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            User Approvals
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Review and approve pending user registrations
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={exportPendingUsers}
            variant="chalkOutline"
            disabled={filteredUsers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          <Button
            onClick={handleBulkApprove}
            variant="chalk"
            disabled={filteredUsers.length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve All ({filteredUsers.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, department, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="STUDENT">Students</SelectItem>
                <SelectItem value="LECTURER">Lecturers</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {pendingUsers.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {pendingUsers.filter(u => u.role === 'STUDENT').length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Students
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {pendingUsers.filter(u => u.role === 'LECTURER').length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Lecturers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {pendingUsers.filter(u => u.faceProfile.qualityScore >= 0.8).length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  High Quality
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending Users ({filteredUsers.length})</span>
            {filteredUsers.length > 0 && (
              <span className="text-sm font-normal text-slate-500">
                Showing {filteredUsers.length} of {pendingUsers.length} users
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                No pending users found
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {searchTerm || filterRole !== 'ALL' || filterDepartment !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'All users have been processed'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                              {user.name}
                            </h3>
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              getRoleColor(user.role)
                            )}>
                              {FormatUtils.formatRole(user.role)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                            {(user.studentId || user.employeeId) && (
                              <span className="flex items-center gap-1">
                                <IdCard className="w-3 h-3" />
                                {user.studentId || user.employeeId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Department</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {user.department}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Registration</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {DateUtils.getRelativeTime(user.createdAt)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Face Quality</p>
                          <p className={cn("font-medium", getQualityColor(user.faceProfile.qualityScore))}>
                            {FormatUtils.formatConfidence(user.faceProfile.qualityScore)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Documents</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {user.documents.filter(d => d.status === 'APPROVED').length}/{user.documents.length} Verified
                          </p>
                        </div>
                      </div>

                      {/* Progress Indicators */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <FileText className={cn(
                            "w-4 h-4",
                            user.documents.some(d => d.status === 'APPROVED') 
                              ? "text-green-500" 
                              : "text-slate-400"
                          )} />
                          <span className="text-xs text-slate-500">Documents</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Camera className={cn(
                            "w-4 h-4",
                            user.faceProfile.qualityScore >= 0.6 
                              ? "text-green-500" 
                              : "text-slate-400"
                          )} />
                          <span className="text-xs text-slate-500">Face Profile</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedUser(user)}
                        variant="ghost"
                        size="sm"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        onClick={() => handleRejectUser(user)}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      
                      <Button
                        onClick={() => handleApproveUser(user.id)}
                        variant="chalk"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedUser?.name}'s registration. 
              This message will be sent to the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this registration is being rejected..."
                className="w-full h-24 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="chalkOutline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
}