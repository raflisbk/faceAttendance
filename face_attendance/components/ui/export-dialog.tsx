'use client'

import React, { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  dateRange: 'today' | 'week' | 'month' | 'semester' | 'custom'
  startDate?: Date
  endDate?: Date
  includeColumns: string[]
  filterBy?: {
    classes?: string[]
    students?: string[]
    attendanceStatus?: string[]
  }
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => Promise<void>
  exportType: 'attendance' | 'students' | 'classes' | 'reports'
  availableClasses?: Array<{ id: string; name: string }>
  availableColumns?: Array<{ key: string; label: string; required?: boolean }>
}

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  exportType,
  availableClasses = [],
  availableColumns = []
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'month',
    includeColumns: availableColumns.filter(col => col.required).map(col => col.key),
    filterBy: {}
  })

  const defaultColumns = {
    attendance: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'studentId', label: 'Student ID', required: true },
      { key: 'className', label: 'Class Name', required: true },
      { key: 'date', label: 'Date', required: true },
      { key: 'status', label: 'Attendance Status', required: true },
      { key: 'checkInTime', label: 'Check-in Time', required: false },
      { key: 'location', label: 'Location', required: false },
      { key: 'method', label: 'Check-in Method', required: false }
    ],
    students: [
      { key: 'name', label: 'Student Name', required: true },
      { key: 'studentId', label: 'Student ID', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'phone', label: 'Phone Number', required: false },
      { key: 'enrolledClasses', label: 'Enrolled Classes', required: false },
      { key: 'attendanceRate', label: 'Overall Attendance Rate', required: false },
      { key: 'status', label: 'Account Status', required: false }
    ],
    classes: [
      { key: 'name', label: 'Class Name', required: true },
      { key: 'code', label: 'Class Code', required: true },
      { key: 'lecturer', label: 'Lecturer', required: true },
      { key: 'schedule', label: 'Schedule', required: true },
      { key: 'location', label: 'Location', required: false },
      { key: 'enrolledStudents', label: 'Enrolled Students', required: false },
      { key: 'averageAttendance', label: 'Average Attendance', required: false }
    ],
    reports: [
      { key: 'metric', label: 'Metric', required: true },
      { key: 'value', label: 'Value', required: true },
      { key: 'period', label: 'Period', required: true },
      { key: 'trend', label: 'Trend', required: false },
      { key: 'comparison', label: 'Comparison', required: false }
    ]
  }

  const columns = availableColumns.length > 0 ? availableColumns : defaultColumns[exportType] || []

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(exportOptions)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      includeColumns: checked
        ? [...prev.includeColumns, columnKey]
        : prev.includeColumns.filter(col => col !== columnKey)
    }))
  }

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'semester': return 'This Semester'
      case 'custom': return 'Custom Range'
      default: return range
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <FileSpreadsheet className="w-4 h-4" />
      case 'xlsx': return <FileSpreadsheet className="w-4 h-4" />
      case 'pdf': return <FileText className="w-4 h-4" />
      default: return <Download className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)} Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {['csv', 'xlsx', 'pdf'].map((format) => (
                <button
                  key={format}
                  onClick={() => setExportOptions(prev => ({ ...prev, format: format as any }))}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                    exportOptions.format === format
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  {getFormatIcon(format)}
                  <span className="font-medium">{format.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Date Range</Label>
            <Select 
              value={exportOptions.dateRange} 
              onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['today', 'week', 'month', 'semester', 'custom'].map((range) => (
                  <SelectItem key={range} value={range}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {getDateRangeLabel(range)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {exportOptions.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={exportOptions.startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      setExportOptions(prev => ({
                        ...prev,
                        startDate: e.target.value ? new Date(e.target.value) : undefined
                      } as ExportOptions))
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={exportOptions.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      setExportOptions(prev => ({
                        ...prev,
                        endDate: e.target.value ? new Date(e.target.value) : undefined
                      } as ExportOptions))
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Columns Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Include Columns</Label>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {columns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={exportOptions.includeColumns.includes(column.key)}
                    onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                    disabled={column.required}
                  />
                  <Label 
                    htmlFor={column.key} 
                    className={cn(
                      "text-sm",
                      column.required && "font-medium text-blue-700 dark:text-blue-300"
                    )}
                  >
                    {column.label}
                    {column.required && " *"}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              * Required columns cannot be removed
            </p>
          </div>

          {/* Filters */}
          {(exportType === 'attendance' || exportType === 'reports') && availableClasses.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Filter by Classes</Label>
              <Select 
                value={exportOptions.filterBy?.classes?.[0] || 'all'}
                onValueChange={(value) => {
                  const updatedFilterBy = { ...exportOptions.filterBy }
                  if (value === 'all') {
                    delete updatedFilterBy.classes
                  } else {
                    updatedFilterBy.classes = [value]
                  }
                  setExportOptions(prev => ({ ...prev, filterBy: updatedFilterBy }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classes to include" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      All Classes
                    </div>
                  </SelectItem>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {exportType === 'attendance' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Filter by Attendance Status</Label>
              <div className="flex gap-3">
                {['present', 'absent', 'late'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={exportOptions.filterBy?.attendanceStatus?.includes(status) || false}
                      onCheckedChange={(checked) => {
                        setExportOptions(prev => ({
                          ...prev,
                          filterBy: {
                            ...prev.filterBy,
                            attendanceStatus: checked
                              ? [...(prev.filterBy?.attendanceStatus || []), status]
                              : (prev.filterBy?.attendanceStatus || []).filter(s => s !== status)
                          }
                        }))
                      }}
                    />
                    <Label htmlFor={status} className="text-sm capitalize">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Preview */}
          <Card className="bg-slate-50 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-sm">Export Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Format:</span>
                <span className="font-medium">{exportOptions.format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date Range:</span>
                <span className="font-medium">{getDateRangeLabel(exportOptions.dateRange)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Columns:</span>
                <span className="font-medium">{exportOptions.includeColumns.length} selected</span>
              </div>
              {exportOptions.filterBy?.classes && (
                <div className="flex justify-between text-sm">
                  <span>Classes:</span>
                  <span className="font-medium">{exportOptions.filterBy.classes.length} selected</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={onClose} variant="chalkOutline">
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || exportOptions.includeColumns.length === 0}
              variant="chalk"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}