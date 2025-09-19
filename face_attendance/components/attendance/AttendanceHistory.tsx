'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: Date
  checkInTime: Date
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'
  method: 'FACE_RECOGNITION' | 'QR_CODE' | 'MANUAL'
  confidence?: number
  class: {
    id: string
    name: string
    code: string
    lecturer?: {
      firstName: string
      lastName: string
    }
  }
  location?: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AttendanceHistoryProps {
  records: AttendanceRecord[]
  stats: AttendanceStats
  pagination: Pagination
  loading?: boolean
  onPageChange?: (page: number) => void
  onFilterChange?: (filters: {
    search?: string
    status?: string
    classId?: string
    dateRange?: { start: Date; end: Date }
  }) => void
  onExport?: () => void
}

export function AttendanceHistory({
  records,
  stats,
  pagination,
  loading = false,
  onPageChange,
  onFilterChange,
  onExport
}: AttendanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [classFilter, setClassFilter] = useState<string>('')

  const getStatusBadge = (status: string) => {
    const variants = {
      PRESENT: { variant: 'default' as const, color: 'bg-green-500' },
      LATE: { variant: 'secondary' as const, color: 'bg-yellow-500' },
      ABSENT: { variant: 'destructive' as const, color: 'bg-red-500' },
      EXCUSED: { variant: 'outline' as const, color: 'bg-blue-500' }
    }

    const config = variants[status as keyof typeof variants] || variants.ABSENT

    return (
      <Badge variant={config.variant}>
        <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
        {status}
      </Badge>
    )
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'FACE_RECOGNITION':
        return <User className="h-4 w-4" />
      case 'QR_CODE':
        return <Calendar className="h-4 w-4" />
      case 'MANUAL':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onFilterChange?.({ search: value, status: statusFilter, classId: classFilter })
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    onFilterChange?.({ search: searchTerm, status: value, classId: classFilter })
  }

  const handleClassFilter = (value: string) => {
    setClassFilter(value)
    onFilterChange?.({ search: searchTerm, status: statusFilter, classId: value })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get unique classes for filter
  const uniqueClasses = Array.from(
    new Map(records.map(record => [record.class.id, record.class])).values()
  )

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Attendance History
              </CardTitle>
              <CardDescription>
                Your attendance records and status
              </CardDescription>
            </div>
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="EXCUSED">Excused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={handleClassFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="hidden md:table-cell">Lecturer</TableHead>
                  <TableHead className="hidden lg:table-cell">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatDate(record.date)}</div>
                          {record.checkInTime && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(record.checkInTime)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{record.class.name}</div>
                          <div className="text-sm text-muted-foreground">{record.class.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(record.method)}
                          <span className="text-sm">{record.method.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {record.class.lecturer && (
                          <div className="text-sm">
                            {record.class.lecturer.firstName} {record.class.lecturer.lastName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {record.confidence && (
                          <div className="text-sm">
                            {Math.round(record.confidence * 100)}%
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange?.(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  {pagination.totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant={pagination.totalPages === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange?.(pagination.totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {pagination.totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceHistory