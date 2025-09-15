import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  MapPin,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Download,
  Wifi,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface Class {
  id: string
  name: string
  code: string
  description?: string
  lecturer: {
    id: string
    name: string
    email: string
  }
  location: {
    id: string
    name: string
    building: string
    capacity: number
    wifiSSID: string
  }
  schedule: {
    dayOfWeek: number
    startTime: string
    endTime: string
    duration: number
  }
  enrollment: {
    current: number
    capacity: number
    waitlist: number
  }
  attendance: {
    averageRate: number
    lastSession?: string
    totalSessions: number
  }
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'DRAFT'
  createdAt: string
  updatedAt: string
}

interface ClassListProps {
  userRole: 'ADMIN' | 'LECTURER' | 'STUDENT'
  userId?: string
  className?: string
}

export const ClassList: React.FC<ClassListProps> = ({
  userRole,
  userId,
  className
}) => {
  const [classes, setClasses] = useState<Class[]>([])
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterDay, setFilterDay] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const toast = useToastHelpers()
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  // Load classes based on user role
  useEffect(() => {
    loadClasses()
  }, [userRole, userId])

  // Filter classes
  useEffect(() => {
    let filtered = classes

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.lecturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.location.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(cls => cls.status === filterStatus)
    }

    // Day filter
    if (filterDay !== 'ALL') {
      filtered = filtered.filter(cls => cls.schedule.dayOfWeek === parseInt(filterDay))
    }

    setFilteredClasses(filtered)
  }, [classes, searchTerm, filterStatus, filterDay])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      
      let endpoint = '/api/classes'
      if (userRole === 'LECTURER' && userId) {
        endpoint = `/api/classes/lecturer/${userId}`
      } else if (userRole === 'STUDENT' && userId) {
        endpoint = `/api/classes/student/${userId}`
      }

      const response = await fetch(endpoint)
      
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        toast.error('Failed to load classes')
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClass = (classItem: Class) => {
    showConfirm({
      title: 'Delete Class',
      description: `Are you sure you want to delete "${classItem.name}"? This will remove all enrollment data and cannot be undone.`,
      confirmText: 'Delete Class',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/classes/${classItem.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            toast.success('Class deleted successfully')
            setClasses(prev => prev.filter(c => c.id !== classItem.id))
          } else {
            const error = await response.json()
            toast.error(error.message || 'Failed to delete class')
          }
        } catch (error) {
          console.error('Error deleting class:', error)
          toast.error('Failed to delete class')
        }
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'INACTIVE': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600 dark:text-green-400'
    if (rate >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getEnrollmentStatus = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100
    if (percentage >= 90) return { color: 'text-red-600 dark:text-red-400', status: 'Full' }
    if (percentage >= 70) return { color: 'text-yellow-600 dark:text-yellow-400', status: 'High' }
    return { color: 'text-green-600 dark:text-green-400', status: 'Available' }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading classes..." className="py-12" />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {userRole === 'ADMIN' ? 'All Classes' : userRole === 'LECTURER' ? 'My Classes' : 'Enrolled Classes'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {userRole === 'ADMIN' 
              ? 'Manage all classes in the system'
              : userRole === 'LECTURER' 
              ? 'Manage your teaching schedule and attendance'
              : 'View your enrolled classes and attendance'}
          </p>
        </div>
        
        {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
          <div className="flex items-center gap-3">
            <Button variant="chalkOutline" onClick={() => window.location.reload()}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Link href="/classes/create">
              <Button variant="chalk">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search classes, codes, lecturers, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Days</SelectItem>
                {dayNames.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'chalk' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'chalk' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <BookOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {classes.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Classes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {classes.reduce((sum, cls) => sum + cls.enrollment.current, 0)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Enrolled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {classes.length > 0 ? Math.round((classes.reduce((sum, cls) => sum + cls.attendance.averageRate, 0) / classes.length) * 100) : 0}%
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Avg Attendance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {classes.filter(cls => cls.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Active Classes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes List/Grid */}
      {filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              No classes found
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {searchTerm || filterStatus !== 'ALL' || filterDay !== 'ALL'
                ? 'Try adjusting your filters'
                : userRole === 'STUDENT' 
                ? 'You are not enrolled in any classes yet'
                : 'No classes have been created yet'}
            </p>
            {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
              <Link href="/classes/create">
                <Button variant="chalk" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Class
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{classItem.name}</CardTitle>
                    <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                      {classItem.code}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      getStatusColor(classItem.status)
                    )}>
                      {classItem.status}
                    </span>
                    
                    {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                      <div className="relative">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Lecturer Info */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {classItem.lecturer.name}
                  </span>
                </div>

                {/* Schedule Info */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {dayNames[classItem.schedule.dayOfWeek]} 
                    {' '}
                    {FormatUtils.formatTime(new Date(`2000-01-01T${classItem.schedule.startTime}`))}
                    {' - '}
                    {FormatUtils.formatTime(new Date(`2000-01-01T${classItem.schedule.endTime}`))}
                  </span>
                </div>

                {/* Location Info */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {classItem.location.name}, {classItem.location.building}
                  </span>
                </div>

                {/* WiFi Info */}
                <div className="flex items-center gap-2 text-sm">
                  <Wifi className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    {classItem.location.wifiSSID}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {classItem.enrollment.current}/{classItem.enrollment.capacity}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enrolled
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className={cn(
                      "text-lg font-semibold",
                      getAttendanceColor(classItem.attendance.averageRate)
                    )}>
                      {Math.round(classItem.attendance.averageRate * 100)}%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Attendance
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/classes/${classItem.id}`} className="flex-1">
                    <Button variant="chalkOutline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  
                  {userRole === 'STUDENT' && (
                    <Link href={`/classes/${classItem.id}/attendance`} className="flex-1">
                      <Button variant="chalk" size="sm" className="w-full">
                        <Clock className="w-4 h-4 mr-2" />
                        Attend
                      </Button>
                    </Link>
                  )}
                  
                  {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                    <>
                      <Link href={`/classes/${classItem.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClass(classItem)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List View
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredClasses.map((classItem) => (
                <div key={classItem.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Main Info */}
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                            {classItem.name}
                          </h3>
                          <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                            {classItem.code}
                          </p>
                        </div>
                        
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                          getStatusColor(classItem.status)
                        )}>
                          {classItem.status}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Lecturer</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {classItem.lecturer.name}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Schedule</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {dayNames[classItem.schedule.dayOfWeek]} {FormatUtils.formatTime(new Date(`2000-01-01T${classItem.schedule.startTime}`))}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Location</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {classItem.location.name}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Enrollment</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {classItem.enrollment.current}/{classItem.enrollment.capacity}
                            {classItem.enrollment.waitlist > 0 && (
                              <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                                (+{classItem.enrollment.waitlist})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar for Enrollment */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-slate-800 dark:bg-slate-300 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((classItem.enrollment.current / classItem.enrollment.capacity) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          getAttendanceColor(classItem.attendance.averageRate)
                        )}>
                          {Math.round(classItem.attendance.averageRate * 100)}% attendance
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-6">
                      <Link href={`/classes/${classItem.id}`}>
                        <Button variant="chalkOutline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      
                      {userRole === 'STUDENT' && (
                        <Link href={`/classes/${classItem.id}/attendance`}>
                          <Button variant="chalk" size="sm">
                            <Clock className="w-4 h-4 mr-2" />
                            Check In
                          </Button>
                        </Link>
                      )}
                      
                      {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                        <>
                          <Link href={`/classes/${classItem.id}/manage`}>
                            <Button variant="ghost" size="sm">
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <Link href={`/classes/${classItem.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClass(classItem)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog />
    </div>
  )
}