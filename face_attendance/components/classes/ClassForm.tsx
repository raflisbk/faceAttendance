import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Save,
  X,
  Clock,
  MapPin,
  Users,
  Wifi,
  Calendar,
  User,
  ArrowLeft,
  Plus,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils } from '@/lib/utils'

const classSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters'),
  code: z.string().min(3, 'Class code must be at least 3 characters').max(10, 'Class code must be less than 10 characters'),
  description: z.string().optional(),
  lecturerId: z.string().min(1, 'Please select a lecturer'),
  locationId: z.string().min(1, 'Please select a location'),
  schedule: z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
  }),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(500, 'Capacity cannot exceed 500'),
  attendancePolicy: z.object({
    lateGracePeriod: z.number().min(0).max(60), // minutes
    autoMarkAbsent: z.boolean(),
    requireWifiValidation: z.boolean(),
    allowQRBackup: z.boolean(),
  }),
  semester: z.string().min(1, 'Semester is required'),
  credits: z.number().min(1).max(10),
  prerequisites: z.array(z.string()).optional(),
})

type ClassFormData = z.infer<typeof classSchema>

interface Location {
  id: string
  name: string
  building: string
  capacity: number
  wifiSSID: string
}

interface Lecturer {
  id: string
  name: string
  email: string
  department: string
}

interface ClassFormProps {
  classId?: string // If provided, edit mode
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

export const ClassForm: React.FC<ClassFormProps> = ({
  classId,
  onSuccess,
  onCancel,
  className
}) => {
  const router = useRouter()
  const toast = useToastHelpers()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState('')

  const isEditMode = !!classId
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      lecturerId: '',
      locationId: '',
      schedule: {
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '11:00',
      },
      capacity: 30,
      attendancePolicy: {
        lateGracePeriod: 15,
        autoMarkAbsent: true,
        requireWifiValidation: true,
        allowQRBackup: true,
      },
      semester: '',
      credits: 3,
      prerequisites: [],
    }
  })

  useEffect(() => {
    loadInitialData()
    if (isEditMode) {
      loadClassData()
    }
  }, [classId])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Load locations and lecturers
      const [locationsResponse, lecturersResponse] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/lecturers')
      ])

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json()
        setLocations(locationsData.locations || [])
      }

      if (lecturersResponse.ok) {
        const lecturersData = await lecturersResponse.json()
        setLecturers(lecturersData.lecturers || [])
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load form data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadClassData = async () => {
    if (!classId) return

    try {
      const response = await fetch(`/api/classes/${classId}`)
      
      if (response.ok) {
        const data = await response.json()
        const classData = data.class

        form.reset({
          name: classData.name,
          code: classData.code,
          description: classData.description || '',
          lecturerId: classData.lecturerId,
          locationId: classData.locationId,
          schedule: {
            dayOfWeek: classData.schedule.dayOfWeek,
            startTime: classData.schedule.startTime,
            endTime: classData.schedule.endTime,
          },
          capacity: classData.capacity,
          attendancePolicy: {
            lateGracePeriod: classData.attendancePolicy?.lateGracePeriod || 15,
            autoMarkAbsent: classData.attendancePolicy?.autoMarkAbsent || true,
            requireWifiValidation: classData.attendancePolicy?.requireWifiValidation || true,
            allowQRBackup: classData.attendancePolicy?.allowQRBackup || true,
          },
          semester: classData.semester,
          credits: classData.credits,
          prerequisites: classData.prerequisites || [],
        })

        setPrerequisites(classData.prerequisites || [])
        
        // Set selected location
        const location = locations.find(l => l.id === classData.locationId)
        if (location) setSelectedLocation(location)
      } else {
        toast.error('Failed to load class data')
      }
    } catch (error) {
      console.error('Error loading class data:', error)
      toast.error('Failed to load class data')
    }
  }

  const onSubmit = async (data: ClassFormData) => {
    setIsSubmitting(true)

    try {
      // Validate schedule
      if (data.schedule.startTime >= data.schedule.endTime) {
        toast.error('End time must be after start time')
        return
      }

      // Check location capacity
      if (selectedLocation && data.capacity > selectedLocation.capacity) {
        toast.error(`Class capacity cannot exceed location capacity (${selectedLocation.capacity})`)
        return
      }

      const submitData = {
        ...data,
        prerequisites,
      }

      const url = isEditMode ? `/api/classes/${classId}` : '/api/classes'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(
          isEditMode ? 'Class updated successfully' : 'Class created successfully'
        )
        
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/classes/${result.class.id}`)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} class`)
      }
    } catch (error) {
      console.error('Error submitting class:', error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} class`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLocationChange = (locationId: string) => {
    const location = locations.find(l => l.id === locationId)
    setSelectedLocation(location || null)
    
    // Auto-adjust capacity if it exceeds location capacity
    if (location && form.getValues('capacity') > location.capacity) {
      form.setValue('capacity', location.capacity)
      toast.info(`Capacity adjusted to location maximum (${location.capacity})`)
    }
  }

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite.trim())) {
      const updatedPrerequisites = [...prerequisites, newPrerequisite.trim()]
      setPrerequisites(updatedPrerequisites)
      form.setValue('prerequisites', updatedPrerequisites)
      setNewPrerequisite('')
    }
  }

  const removePrerequisite = (prerequisite: string) => {
    const updatedPrerequisites = prerequisites.filter(p => p !== prerequisite)
    setPrerequisites(updatedPrerequisites)
    form.setValue('prerequisites', updatedPrerequisites)
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading form data..." className="py-12" />
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <Card className="shadow-xl border-slate-200 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 dark:bg-slate-200 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white dark:text-slate-800" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {isEditMode ? 'Edit Class' : 'Create New Class'}
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400">
                  {isEditMode ? 'Update class information and settings' : 'Set up a new class with schedule and policies'}
                </p>
              </div>
            </div>

            <Button
              onClick={onCancel || (() => router.back())}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Introduction to Computer Science"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., CS101"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this class
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Brief description of the class content and objectives..."
                          className="w-full h-20 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2024-1">2024 Semester 1</SelectItem>
                            <SelectItem value="2024-2">2024 Semester 2</SelectItem>
                            <SelectItem value="2025-1">2025 Semester 1</SelectItem>
                            <SelectItem value="2025-2">2025 Semester 2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credits</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            disabled={isSubmitting}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max={selectedLocation?.capacity || 500}
                            disabled={isSubmitting}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        {selectedLocation && (
                          <FormDescription>
                            Location capacity: {selectedLocation.capacity}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Lecturer and Location */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Assignment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lecturerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lecturer</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lecturer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lecturers.map(lecturer => (
                              <SelectItem key={lecturer.id} value={lecturer.id}>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  <div>
                                    <p className="font-medium">{lecturer.name}</p>
                                    <p className="text-xs text-slate-500">{lecturer.department}</p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleLocationChange(value)
                          }} 
                          defaultValue={field.value} 
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <div>
                                    <p className="font-medium">{location.name}</p>
                                    <p className="text-xs text-slate-500">
                                      {location.building} • Capacity: {location.capacity}
                                    </p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedLocation && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">
                        WiFi Network
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Students will need to connect to <strong>{selectedLocation.wifiSSID}</strong> for attendance verification
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Schedule
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="schedule.dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()} 
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dayNames.map((day, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {day}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schedule.startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schedule.endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Prerequisites */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Prerequisites
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add prerequisite class code (e.g., MATH101)"
                      value={newPrerequisite}
                      onChange={(e) => setNewPrerequisite(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      onClick={addPrerequisite}
                      disabled={!newPrerequisite.trim() || isSubmitting}
                      variant="chalkOutline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {prerequisites.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {prerequisites.map((prerequisite, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm"
                        >
                          <span>{prerequisite}</span>
                          <button
                            type="button"
                            onClick={() => removePrerequisite(prerequisite)}
                            disabled={isSubmitting}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Policy */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Attendance Policy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="attendancePolicy.lateGracePeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Grace Period (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="60"
                            disabled={isSubmitting}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          How long after class starts students can still check in as "late"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="attendancePolicy.autoMarkAbsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Auto-mark as absent
                            </FormLabel>
                            <FormDescription>
                              Automatically mark students as absent after grace period
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="attendancePolicy.requireWifiValidation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Require WiFi validation
                            </FormLabel>
                            <FormDescription>
                              Students must be connected to class WiFi to check in
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="attendancePolicy.allowQRBackup"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Allow QR code backup
                            </FormLabel>
                            <FormDescription>
                              Enable QR code check-in when face recognition fails
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  onClick={onCancel || (() => router.back())}
                  variant="chalkOutline"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="chalk"
                  disabled={isSubmitting}
                  className="px-8"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update Class' : 'Create Class'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}