'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  Calendar,
  Download
} from 'lucide-react'
import { ApiClient } from '@/lib/api-client'
import { useToastHelpers } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface Class {
  id: string
  name: string
  code: string
  description?: string
  lecturerId: string
  locationId: string
  capacity: number
  isActive: boolean
  createdAt: string
  lecturer: {
    name: string
  }
  location: {
    name: string
    building: string
    floor: string
  }
  enrollments: Array<{ id: string }>
  schedule?: any
}

export function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const toast = useToastHelpers()

  useEffect(() => {
    loadClasses()
  }, [currentPage, searchTerm, statusFilter])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      })

      const response = await ApiClient.get(`/api/admin/classes?${params}`)
      setClasses(response.data.classes)
      setTotalPages(response.data.pagination.totalPages)
    } catch (error) {
      toast.showError('Failed to load classes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusToggle = async (classId: string, currentStatus: boolean) => {
    try {
      await ApiClient.patch(`/api/admin/classes/${classId}`, {
        isActive: !currentStatus
      })
      await loadClasses()
      toast.showSuccess('Class status updated successfully')
    } catch (error) {
      toast.showError('Failed to update class status')
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-500/20 text-green-400'
      : 'bg-gray-500/20 text-gray-400'
  }

  const formatSchedule = (schedule: any) => {
    if (!schedule) return 'No schedule'
    // This would depend on your schedule format
    return 'Schedule available'
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Class Management
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Classes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="w-6 h-6 text-slate-400" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No classes found
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {classItem.name}
                        </h3>
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {classItem.code}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusColor(classItem.isActive))}>
                          {classItem.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {classItem.description && (
                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                          {classItem.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-slate-300">
                          <Users className="w-4 h-4 mr-2 text-slate-400" />
                          <span className="text-slate-400">Lecturer:</span>
                          <span className="ml-1">{classItem.lecturer.name}</span>
                        </div>

                        <div className="flex items-center text-slate-300">
                          <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                          <span className="text-slate-400">Location:</span>
                          <span className="ml-1">
                            {classItem.location.building} - {classItem.location.floor}
                          </span>
                        </div>

                        <div className="flex items-center text-slate-300">
                          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                          <span className="text-slate-400">Schedule:</span>
                          <span className="ml-1">{formatSchedule(classItem.schedule)}</span>
                        </div>
                      </div>

                      <div className="flex items-center mt-3 space-x-4 text-sm text-slate-400">
                        <span>
                          Capacity: {classItem.capacity}
                        </span>
                        <span>
                          Enrolled: {classItem.enrollments.length}
                        </span>
                        <span>
                          Created: {new Date(classItem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusToggle(classItem.id, classItem.isActive)}
                        className={cn(
                          "h-8 px-3 text-xs",
                          classItem.isActive
                            ? "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            : "text-green-400 hover:text-green-300 hover:bg-green-500/20"
                        )}
                      >
                        {classItem.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-slate-600 text-slate-300"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-600 text-slate-300"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}