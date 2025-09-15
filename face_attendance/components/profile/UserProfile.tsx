import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  User,
  Mail,
  Phone,
  IdCard,
  Camera,
  Edit,
  Save,
  X,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  department: z.string().min(2, 'Department is required'),
  studentId: z.string().optional(),
  employeeId: z.string().optional()
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserData {
  id: string
  name: string
  email: string
  phone: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  studentId?: string
  employeeId?: string
  department: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  avatar?: string
  createdAt: string
  lastLogin?: string
  faceProfile: {
    enrolled: boolean
    qualityScore?: number
    enrolledAt?: string
    images: string[]
  }
  documents: {
    type: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    uploadedAt: string
    fileUrl: string
  }[]
  attendanceStats: {
    totalClasses: number
    attendedClasses: number
    attendanceRate: number
    lastAttendance?: string
  }
}

interface UserProfileProps {
  userId: string
  userRole: 'ADMIN' | 'LECTURER' | 'STUDENT'
  className?: string
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  userRole,
  className
}) => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const toast = useToastHelpers()
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        
        // Populate form
        form.reset({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          department: data.user.department,
          studentId: data.user.studentId || '',
          employeeId: data.user.employeeId || ''
        })
      } else {
        toast.error('Failed to load user data')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return null

    const formData = new FormData()
    formData.append('avatar', avatarFile)
    formData.append('userId', userId)

    try {
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return data.avatarUrl
      } else {
        throw new Error('Avatar upload failed')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return null
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true)
    
    try {
      // Upload avatar if changed
      let avatarUrl = userData?.avatar
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ...(avatarUrl && { avatar: avatarUrl })
        })
      })

      if (response.ok) {
        const updatedData = await response.json()
        setUserData(updatedData.user)
        setIsEditing(false)
        setAvatarFile(null)
        setAvatarPreview(null)
        toast.success('Profile updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFaceReEnrollment = () => {
    showConfirm({
      title: 'Re-enroll Face Profile',
      description: 'This will replace your current face profile. You will need to capture your face again.',
      confirmText: 'Start Re-enrollment',
      variant: 'warning',
      onConfirm: () => {
        // Navigate to face re-enrollment
        window.location.href = '/profile/face-reenroll'
      }
    })
  }

  const downloadUserData = () => {
    if (!userData) return

    const dataToExport = {
      personalInfo: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        department: userData.department,
        studentId: userData.studentId,
        employeeId: userData.employeeId
      },
      accountInfo: {
        status: userData.status,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
      },
      faceProfile: {
        enrolled: userData.faceProfile.enrolled,
        qualityScore: userData.faceProfile.qualityScore,
        enrolledAt: userData.faceProfile.enrolledAt
      },
      attendanceStats: userData.attendanceStats,
      documents: userData.documents.map(doc => ({
        type: doc.type,
        status: doc.status,
        uploadedAt: doc.uploadedAt
      }))
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user-data-${userData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('User data exported successfully')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'LECTURER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'STUDENT': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading profile..." className="py-12" />
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Failed to load user profile
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            User Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account information and settings
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={downloadUserData}
            variant="chalkOutline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="chalk"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setIsEditing(false)
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  form.reset()
                }}
                variant="chalkOutline"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                variant="chalk"
              >
                {isSaving ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarPreview || userData.avatar ? (
                    <img 
                      src={avatarPreview || userData.avatar} 
                      alt={userData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-slate-500" />
                  )}
                </div>
                
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="w-8 h-8 bg-slate-800 dark:bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors">
                        <Camera className="w-4 h-4 text-white dark:text-slate-800" />
                      </div>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">
                {userData.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {userData.email}
              </p>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                  getRoleColor(userData.role)
                )}>
                  {FormatUtils.formatRole(userData.role)}
                </span>
                
                <span className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                  getStatusColor(userData.status)
                )}>
                  {userData.status}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Member since</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {FormatUtils.formatDate(userData.createdAt)}
                </span>
              </div>
              
              {userData.lastLogin && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Last login</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {DateUtils.getRelativeTime(userData.lastLogin)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Attendance rate</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {Math.round(userData.attendanceStats.attendanceRate * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              icon={<User className="w-4 h-4" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              disabled={!isEditing}
                              icon={<Mail className="w-4 h-4" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              disabled={!isEditing}
                              icon={<Phone className="w-4 h-4" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {userData.role === 'STUDENT' && (
                      <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                icon={<IdCard className="w-4 h-4" />}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {userData.role === 'LECTURER' && (
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                icon={<IdCard className="w-4 h-4" />}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Face Profile Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Face Recognition Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      userData.faceProfile.enrolled 
                        ? "bg-green-100 dark:bg-green-900/20" 
                        : "bg-yellow-100 dark:bg-yellow-900/20"
                    )}>
                      {userData.faceProfile.enrolled ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {userData.faceProfile.enrolled ? 'Face Profile Active' : 'Face Profile Incomplete'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {userData.faceProfile.enrolled
                          ? `Quality: ${FormatUtils.formatConfidence(userData.faceProfile.qualityScore || 0)}`
                          : 'Face enrollment required for attendance'
                        }
                      </p>
                    </div>
                  </div>

                  {userData.faceProfile.enrolled && (
                    <Button
                      onClick={handleFaceReEnrollment}
                      variant="chalkOutline"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-enroll
                    </Button>
                  )}
                </div>

                {userData.faceProfile.enrolled && userData.faceProfile.enrolledAt && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p>
                      Enrolled on {FormatUtils.formatDateTime(userData.faceProfile.enrolledAt)}
                    </p>
                    <p>
                      {userData.faceProfile.images.length} training images captured
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Document Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userData.documents.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No documents uploaded
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Upload your ID document for verification
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          doc.status === 'APPROVED' 
                            ? "bg-green-100 dark:bg-green-900/20"
                            : doc.status === 'REJECTED'
                            ? "bg-red-100 dark:bg-red-900/20" 
                            : "bg-yellow-100 dark:bg-yellow-900/20"
                        )}>
                          {doc.status === 'APPROVED' ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : doc.status === 'REJECTED' ? (
                            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {doc.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Uploaded {FormatUtils.formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          doc.status === 'APPROVED' 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : doc.status === 'REJECTED'
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        )}>
                          {doc.status}
                        </span>
                        
                        <Button
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                          variant="ghost"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attendance Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {userData.attendanceStats.totalClasses}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Classes
                  </p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {userData.attendanceStats.attendedClasses}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Classes Attended
                  </p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(userData.attendanceStats.attendanceRate * 100)}%
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Attendance Rate
                  </p>
                </div>
              </div>

              {userData.attendanceStats.lastAttendance && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Last Attendance:</strong> {DateUtils.getRelativeTime(userData.attendanceStats.lastAttendance)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  )
}