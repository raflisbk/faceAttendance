// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateUserSchema } from '@/lib/validations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Shield, 
  Camera,
  FileText,
  Settings,
  Bell,
  Lock,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { FormatUtils, DateUtils } from '@/lib/utils'
import { FaceCapture } from '@/components/face/FaceCapture'
import type { z } from 'zod'

type ProfileFormData = z.infer<typeof updateUserSchema>

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: string
  status: string
  department: string
  studentId?: string
  employeeId?: string
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: string
  profile?: {
    dateOfBirth?: string
    address?: string
    emergencyContact?: string
    bio?: string
    avatar?: string
  }
  document?: {
    id: string
    type: string
    status: string
    uploadedAt: string
    verifiedAt?: string
  }
  faceProfile?: {
    id: string
    status: string
    quality: number
    enrolledAt: string
  }
  stats?: {
    totalAttendance: number
    present: number
    absent: number
    late: number
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState('profile')
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [isUpdatingFace, setIsUpdatingFace] = useState(false)
  
  const { user, setUser } = useAuthStore()
  const toast = useToastHelpers()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    setValue
  } = useForm<ProfileFormData>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onChange'
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await ApiClient.get(`/api/users/${user?.id}`)
      
      if (response.success) {
        setProfile(response.data)
        
        // Populate form with current data
        reset({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          phoneNumber: response.data.phoneNumber,
          department: response.data.department,
          dateOfBirth: response.data.profile?.dateOfBirth?.split('T')[0],
          address: response.data.profile?.address,
          emergencyContact: response.data.profile?.emergencyContact,
          bio: response.data.profile?.bio
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load profile'
      setError(errorMessage)
      toast.showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true)
      setError('')

      const response = await ApiClient.put(`/api/users/${user?.id}`, data)

      if (response.success) {
        setProfile(response.data)
        setUser({ ...user!, ...response.data })
        toast.showSuccess('Profile updated successfully!')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile'
      setError(errorMessage)
      toast.showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFaceUpdate = async (faceData: any) => {
    try {
      setIsUpdatingFace(true)
      
      const response = await ApiClient.post('/api/face/enrollment', faceData)
      
      if (response.success) {
        toast.showSuccess('Face profile updated successfully!')
        setShowFaceCapture(false)
        await loadProfile() // Refresh profile data
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update face profile'
      toast.showError(errorMessage)
    } finally {
      setIsUpdatingFace(false)
    }
  }

  const handleDeleteFaceProfile = async () => {
    if (!profile?.faceProfile?.id) return

    if (!confirm('Are you sure you want to delete your face profile? You will need to re-enroll to use face recognition.')) {
      return
    }

    try {
      await ApiClient.delete(`/api/face/profile/${profile.faceProfile.id}`)
      toast.showSuccess('Face profile deleted successfully')
      await loadProfile()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete face profile'
      toast.showError(errorMessage)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'VERIFIED':
        return 'text-green-400'
      case 'PENDING_APPROVAL':
      case 'PENDING_VERIFICATION':
        return 'text-yellow-400'
      case 'SUSPENDED':
      case 'REJECTED':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'VERIFIED':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'PENDING_APPROVAL':
      case 'PENDING_VERIFICATION':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'SUSPENDED':
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner className="w-8 h-8 text-white" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-400">Unable to load your profile data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-800 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Header */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.profile?.avatar} />
                <AvatarFallback className="bg-slate-700 text-white text-xl">
                  {profile.firstName[0]}{profile.lastName[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-slate-400 capitalize">
                  {profile.role.toLowerCase()} • {profile.department}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(profile.status)}
                    <span className={cn("text-sm font-medium", getStatusColor(profile.status))}>
                      {profile.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {profile.role === 'STUDENT' && profile.studentId && (
                    <span className="text-sm text-slate-400">
                      ID: {profile.studentId}
                    </span>
                  )}
                  
                  {profile.role === 'LECTURER' && profile.employeeId && (
                    <span className="text-sm text-slate-400">
                      Employee ID: {profile.employeeId}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-400">Member since</p>
                <p className="text-white font-medium">
                  {DateUtils.formatDate(new Date(profile.createdAt), 'MMM yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger 
              value="face" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <Camera className="w-4 h-4 mr-2" />
              Face Recognition
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            {profile.role === 'STUDENT' && profile.stats && (
              <TabsTrigger 
                value="stats" 
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
                      <Input
                        id="firstName"
                        {...register('firstName')}
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                      {errors.firstName && (
                        <p className="text-sm text-red-400">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
                      <Input
                        id="lastName"
                        {...register('lastName')}
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                      {errors.lastName && (
                        <p className="text-sm text-red-400">{errors.lastName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                        />
                        {profile.emailVerified && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                        )}
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-slate-200">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          id="phoneNumber"
                          type="tel"
                          {...register('phoneNumber')}
                          className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                        />
                        {profile.phoneVerified && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                        )}
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-sm text-red-400">{errors.phoneNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-slate-200">Date of Birth</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          id="dateOfBirth"
                          type="date"
                          {...register('dateOfBirth')}
                          className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                      {errors.dateOfBirth && (
                        <p className="text-sm text-red-400">{errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-slate-200">Department</Label>
                      <Input
                        id="department"
                        {...register('department')}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-200">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                      <Textarea
                        id="address"
                        {...register('address')}
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact" className="text-slate-200">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      {...register('emergencyContact')}
                      placeholder="Name and phone number"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-200">Bio</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      placeholder="Tell us about yourself..."
                      className="bg-slate-800/50 border-slate-700 text-white resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={!isDirty || !isValid || isSaving}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      {isSaving ? (
                        <>
                          <LoadingSpinner className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Account Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-white font-medium">Email Verification</p>
                        <p className="text-sm text-slate-400">
                          {profile.emailVerified ? 'Your email is verified' : 'Email not verified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {profile.emailVerified ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Button size="sm" variant="outline">
                          Verify Email
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-white font-medium">Phone Verification</p>
                        <p className="text-sm text-slate-400">
                          {profile.phoneVerified ? 'Your phone is verified' : 'Phone not verified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {profile.phoneVerified ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Button size="sm" variant="outline">
                          Verify Phone
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-white font-medium">Password</p>
                        <p className="text-sm text-slate-400">
                          Last changed: Never
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="face">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Face Recognition Profile</span>
                  {profile.faceProfile && (
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(profile.faceProfile.status)}
                      <span className={cn("text-sm", getStatusColor(profile.faceProfile.status))}>
                        {profile.faceProfile.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.faceProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                        <p className="text-slate-400 text-sm">Quality Score</p>
                        <p className="text-2xl font-bold text-white">
                          {profile.faceProfile.quality}%
                        </p>
                      </div>
                      
                      <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                        <p className="text-slate-400 text-sm">Status</p>
                        <p className={cn("text-lg font-semibold", getStatusColor(profile.faceProfile.status))}>
                          {profile.faceProfile.status.replace('_', ' ')}
                        </p>
                      </div>
                      
                      <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                        <p className="text-slate-400 text-sm">Enrolled</p>
                        <p className="text-lg font-semibold text-white">
                          {DateUtils.formatDate(new Date(profile.faceProfile.enrolledAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        onClick={() => setShowFaceCapture(true)}
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update Face Profile
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleDeleteFaceProfile}
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Face Profile Found
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Set up face recognition to enable quick attendance check-in
                    </p>
                    <Button
                      onClick={() => setShowFaceCapture(true)}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Enroll Face Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Identity Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.document ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                        <div>
                          <p className="text-white font-medium">
                            {profile.document.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-slate-400">
                            Uploaded {DateUtils.formatDate(new Date(profile.document.uploadedAt), 'MMM dd, yyyy')}
                          </p>
                          {profile.document.verifiedAt && (
                            <p className="text-sm text-green-400">
                              Verified {DateUtils.formatDate(new Date(profile.document.verifiedAt), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(profile.document.status)}
                        <span className={cn("text-sm font-medium", getStatusColor(profile.document.status))}>
                          {profile.document.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Replace Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Documents Uploaded
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Upload your identity document for verification
                    </p>
                    <Button className="bg-slate-700 hover:bg-slate-600 text-white">
                      <FileText className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {profile.role === 'STUDENT' && profile.stats && (
            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-white">
                      {profile.stats.totalAttendance}
                    </div>
                    <div className="text-sm text-slate-400">Total Sessions</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {profile.stats.present}
                    </div>
                    <div className="text-sm text-slate-400">Present</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {profile.stats.late}
                    </div>
                    <div className="text-sm text-slate-400">Late</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {profile.stats.absent}
                    </div>
                    <div className="text-sm text-slate-400">Absent</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Face Capture Modal */}
        {showFaceCapture && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-slate-800 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>
                    {profile.faceProfile ? 'Update Face Profile' : 'Enroll Face Profile'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFaceCapture(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FaceCapture
                  mode="enrollment"
                  onCapture={handleFaceUpdate}
                  onCancel={() => setShowFaceCapture(false)}
                  isLoading={isUpdatingFace}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}