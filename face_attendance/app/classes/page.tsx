'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Users,
  MapPin,
  Calendar,
  GraduationCap,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

interface ClassItem {
  id: string
  name: string
  code: string
  description: string
  department: string
  semester: string
  academicYear: string
  credits: number
  capacity: number
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED'
  lecturer: {
    id: string
    firstName: string
    lastName: string
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
    dayOfWeek: string
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
    totalSessions: number
    lastSession: string | null
  }
  _count: {
    enrollments: number
    attendances: number
  }
}

interface Filters {
  search: string
  department: string
  status: string
  lecturerId: string
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    department: '',
    status: '',
    lecturerId: ''
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    loadClasses()
  }, [currentPage, filters])

  const loadClasses = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await ApiClient.get<{
        data: ClassItem[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }>(`/api/classes?${params}`)

      if (response.success && response.data) {
        setClasses(response.data.data)
        setTotalPages(response.data.pagination.totalPages)
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load classes'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-400 bg-green-900/20'
      case 'INACTIVE':
        return 'text-yellow-400 bg-yellow-900/20'
      case 'COMPLETED':
        return 'text-blue-400 bg-blue-900/20'
      default:
        return 'text-slate-400 bg-slate-800/20'
    }
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getDayName = (dayOfWeek: string) => {
    const days = {
      'MONDAY': 'Mon',
      'TUESDAY': 'Tue',
      'WEDNESDAY': 'Wed',
      'THURSDAY': 'Thu',
      'FRIDAY': 'Fri',
      'SATURDAY': 'Sat',
      'SUNDAY': 'Sun'
    }
    return days[dayOfWeek as keyof typeof days] || dayOfWeek
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-slate-400">Please log in to access the classes page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Classes</h1>
            <p className="text-slate-400">Manage class schedules and enrollment</p>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={loadClasses}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>

            {(user.role === 'ADMIN' || user.role === 'LECTURER') && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-700 hover:bg-slate-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Create New Class</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 text-center text-slate-400">
                    Class creation form will be implemented here
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search classes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <Select
                value={filters.department}
                onValueChange={(value) => setFilters({ ...filters, department: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  <SelectItem value="COMPUTER_SCIENCE">Computer Science</SelectItem>
                  <SelectItem value="MATHEMATICS">Mathematics</SelectItem>
                  <SelectItem value="PHYSICS">Physics</SelectItem>
                  <SelectItem value="ENGINEERING">Engineering</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '',
                  department: '',
                  status: '',
                  lecturerId: ''
                })}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <LoadingSpinner className="w-8 h-8 text-white mx-auto" />
            <p className="text-slate-400 mt-4">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Classes Found</h3>
              <p className="text-slate-400">
                No classes match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Card
                key={classItem.id}
                className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-1">
                        {classItem.name}
                      </CardTitle>
                      <p className="text-slate-400 text-sm">
                        {classItem.code} • {classItem.credits} Credits
                      </p>
                    </div>

                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      getStatusColor(classItem.status)
                    )}>
                      {classItem.status}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Lecturer Info */}
                  <div className="flex items-center space-x-2 text-sm">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">
                      {classItem.lecturer.firstName} {classItem.lecturer.lastName}
                    </span>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">
                      {getDayName(classItem.schedule.dayOfWeek)} • {formatTime(classItem.schedule.startTime)} - {formatTime(classItem.schedule.endTime)}
                    </span>
                  </div>

                  {/* Location Info */}
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">
                      {classItem.location.name}
                      {classItem.location.building && `, ${classItem.location.building}`}
                    </span>
                  </div>

                  {/* Enrollment Info */}
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">
                      {classItem.enrollment.current}/{classItem.capacity} enrolled
                    </span>
                  </div>

                  {/* Attendance Rate */}
                  {classItem.attendance.totalSessions > 0 && (
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Attendance Rate</span>
                        <span className="text-green-400 font-medium">
                          {classItem.attendance.averageRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>{classItem.attendance.totalSessions} sessions</span>
                        {classItem.attendance.lastSession && (
                          <span>
                            Last: {new Date(classItem.attendance.lastSession).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      View
                    </Button>

                    {(user.role === 'ADMIN' ||
                      (user.role === 'LECTURER' && classItem.lecturer.id === user.id)) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Previous
            </Button>

            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}