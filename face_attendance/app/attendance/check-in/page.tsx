// app/attendance/check-in/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Camera,
  QrCode,
  MapPin,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { FaceCapture } from '@/components/face/FaceCapture'
import { QRScanner } from '@/components/attendance/QRScanner'
import { format } from 'date-fns'
import type {
  AvailableClass,
  CheckInData,
  LocationCoordinates
} from '@/types/api'
import type { ApiResponse } from '@/lib/api-client'

// Helper function to convert data URL to File
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  if (arr.length < 2 || !arr[1]) {
    throw new Error('Invalid data URL format')
  }
  const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export default function CheckInPage() {
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [checkInMethod, setCheckInMethod] = useState<'face' | 'qr' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [error, setError] = useState<string>('')
  const [wifiSSID, setWifiSSID] = useState<string>('')
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null)
  
  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    const initializeData = async () => {
      await loadAvailableClasses()
      detectWiFi()
      getLocation()
    }

    initializeData()

    // Refresh every minute
    const interval = setInterval(loadAvailableClasses, 60000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAvailableClasses = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response: ApiResponse<AvailableClass[]> = await ApiClient.get('/student/today-classes')

      if (response.success && response.data) {
        setAvailableClasses(response.data)
      } else {
        const errorMsg = response.error?.message || 'Failed to load available classes'
        setError(errorMsg)
        setAvailableClasses([])
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load available classes'
      setError(errorMessage)
      setAvailableClasses([])
    } finally {
      setIsLoading(false)
    }
  }

  const detectWiFi = async () => {
    try {
      // In a real implementation, this would use a WiFi detection library or native API
      // For demo purposes, we'll simulate WiFi detection
      const mockSSIDs = ['Campus-WiFi-Room101', 'Campus-WiFi-Room102', 'Campus-WiFi-Lab1']
      const selectedSSID = mockSSIDs[Math.floor(Math.random() * mockSSIDs.length)]
      if (selectedSSID) {
        setWifiSSID(selectedSSID)
      }
    } catch (error) {
      console.warn('WiFi detection failed:', error)
    }
  }

  const getLocation = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoordinates({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            })
          },
          (error) => {
            console.warn('Location access denied:', error)
            setCoordinates(null)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      }
    } catch (error) {
      console.warn('Geolocation failed:', error)
      setCoordinates(null)
    }
  }

  const handleCheckIn = async (classId: string, method: 'face' | 'qr') => {
    setSelectedClass(classId)
    setCheckInMethod(method)
  }

  const handleCheckInComplete = async (data: { faceImage?: File; qrData?: string; [key: string]: any }) => {
    try {
      setIsCheckingIn(true)

      if (!selectedClass || !checkInMethod) {
        toast.error('Invalid check-in request')
        return
      }

      // Find the selected class to get its location ID
      const selectedClassData = availableClasses.find(cls => cls.id === selectedClass)
      if (!selectedClassData) {
        toast.error('Class not found')
        return
      }

      const checkInData: CheckInData = {
        classId: selectedClass,
        locationId: selectedClassData.location.id,
        method: checkInMethod === 'face' ? 'FACE_RECOGNITION' : 'QR_CODE',
        ...(wifiSSID && { wifiSSID }),
        ...(coordinates && { coordinates }),
        ...(data.faceImage && { faceImage: data.faceImage })
      }

      const response: ApiResponse<any> = await ApiClient.post('/attendance/check-in', checkInData)

      if (response.success) {
        toast.success('Check-in successful')
        setSelectedClass(null)
        setCheckInMethod(null)
        await loadAvailableClasses() // Refresh the list
      } else {
        const errorMsg = response.error?.message || 'Check-in failed'
        toast.error(errorMsg)
        console.error('Check-in failed:', response)
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Check-in failed due to network error'
      toast.error(errorMessage)
      console.error('Check-in error:', error)
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckInCancel = () => {
    setSelectedClass(null)
    setCheckInMethod(null)
  }

  const getClassStatus = (classItem: AvailableClass) => {
    // Check if user has already checked in
    if (classItem.hasCheckedIn || classItem.attendance) return 'checked-in'

    // Check if class is currently available for check-in
    if (classItem.canCheckIn) return 'available'

    // Check if class is in session but can't check in (missed window)
    if (classItem.isInSession && !classItem.canCheckIn) return 'missed'

    // Check if class is upcoming
    if (classItem.timeUntilStart && classItem.timeUntilStart > 0) return 'upcoming'

    // Default to ended
    return 'ended'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in':
        return 'border-green-800 bg-green-900/20'
      case 'available':
        return 'border-blue-800 bg-blue-900/20'
      case 'upcoming':
        return 'border-yellow-800 bg-yellow-900/20'
      case 'missed':
      case 'ended':
        return 'border-red-800 bg-red-900/20'
      default:
        return 'border-slate-700 bg-slate-800/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked-in':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'available':
        return <Clock className="w-5 h-5 text-blue-400" />
      case 'upcoming':
        return <Calendar className="w-5 h-5 text-yellow-400" />
      case 'missed':
      case 'ended':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  // Redirect if not authenticated or not a student
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-slate-400">Please log in to access the check-in page.</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'STUDENT') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Student Access Only</h2>
          <p className="text-slate-400">Only students can access the attendance check-in system.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 text-white mx-auto mb-4" />
          <p className="text-slate-400">Loading available classes...</p>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance Check-In</h1>
            <p className="text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={loadAvailableClasses}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-800 text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Location & WiFi Info */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white">Location Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
                <Wifi className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-white font-medium">WiFi Network</p>
                  <p className="text-sm text-slate-400">
                    {wifiSSID || 'Not detected'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
                <MapPin className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-white font-medium">GPS Location</p>
                  <p className="text-sm text-slate-400">
                    {coordinates ? 'Available' : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Classes */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Available Classes</h2>
          
          {availableClasses.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Classes Available</h3>
                <p className="text-slate-400">
                  You have no classes available for check-in at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableClasses.map((classItem) => {
                const status = getClassStatus(classItem)
                
                return (
                  <Card
                    key={classItem.id}
                    className={cn(
                      "backdrop-blur-sm border-2 transition-all",
                      getStatusColor(status)
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center space-x-2">
                            {getStatusIcon(status)}
                            <span>{classItem.name}</span>
                          </CardTitle>
                          <p className="text-slate-400">
                            {classItem.code} • {classItem.lecturer.name}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-slate-400">
                            {format(new Date(classItem.schedule.startTime), 'HH:mm')} - {format(new Date(classItem.schedule.endTime), 'HH:mm')}
                          </p>
                          {(classItem.hasCheckedIn || classItem.attendance) && classItem.attendance?.checkInTime && (
                            <p className="text-xs text-green-400 mt-1">
                              Checked in at {format(new Date(classItem.attendance.checkInTime), 'HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Location Info */}
                        <div className="flex items-center space-x-2 text-sm text-slate-300">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>
                            {classItem.location.name}
                            {classItem.location.building && `, ${classItem.location.building}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-slate-300">
                          <Wifi className="w-4 h-4 text-slate-400" />
                          <span>Required: {classItem.location.wifiSSID}</span>
                          {wifiSSID === classItem.location.wifiSSID && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </div>

                        {/* Time Information */}
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          {status === 'upcoming' && classItem.timeUntilStart && (
                            <p className="text-sm text-yellow-400">
                              Starts in {Math.abs(classItem.timeUntilStart)} minutes
                            </p>
                          )}

                          {status === 'available' && classItem.timeUntilEnd && (
                            <p className="text-sm text-blue-400">
                              Check-in window closes in {Math.abs(classItem.timeUntilEnd)} minutes
                            </p>
                          )}
                          
                          {status === 'checked-in' && classItem.attendance && (
                            <div className="space-y-1">
                              <p className="text-sm text-green-400">
                                ✓ Attendance recorded
                              </p>
                              <p className="text-xs text-slate-400">
                                Status: {classItem.attendance.status}
                              </p>
                            </div>
                          )}
                          
                          {(status === 'missed' || status === 'ended') && (
                            <p className="text-sm text-red-400">
                              Check-in window has closed
                            </p>
                          )}
                        </div>

                        {/* Check-in Buttons */}
                        {status === 'available' && !classItem.hasCheckedIn && !classItem.attendance && (
                          <div className="flex space-x-3">
                            <Button
                              onClick={() => handleCheckIn(classItem.id, 'face')}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Face Check-in
                            </Button>
                            
                            <Button
                              variant="outline"
                              onClick={() => handleCheckIn(classItem.id, 'qr')}
                              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Code
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Check-in Modal */}
        {selectedClass && checkInMethod && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-slate-800 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>
                    {checkInMethod === 'face' ? 'Face Recognition Check-in' : 'QR Code Check-in'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCheckInCancel}
                    className="text-slate-400 hover:text-white"
                    disabled={isCheckingIn}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkInMethod === 'face' ? (
                  <FaceCapture
                    onCapture={(imageData: string) => {
                      const file = dataURLtoFile(imageData, 'face-capture.jpg')
                      handleCheckInComplete({ faceImage: file })
                    }}
                    onError={(error: string) => {
                      toast.error(error)
                    }}
                  />
                ) : (
                  <QRScanner
                    onScan={(qrData: string) => {
                      handleCheckInComplete({ qrData })
                    }}
                    onClose={handleCheckInCancel}
                    onError={(error: string) => {
                      toast.error(error)
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}