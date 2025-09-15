import React, { useState, useEffect, useCallback } from 'react'
import { FaceCapture } from './FaceCapture'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Camera,
  Wifi,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  RefreshCw,
  QrCode,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Class {
  id: string
  name: string
  code: string
  lecturer: string
  location: {
    name: string
    building: string
    wifiSSID: string
  }
  schedule: {
    startTime: string
    endTime: string
    dayOfWeek: number
  }
  enrollmentCount: number
}

interface AttendanceStatus {
  canCheckIn: boolean
  reason?: string
  timeWindow?: {
    opensAt: string
    closesAt: string
  }
  location?: {
    verified: boolean
    currentSSID?: string
    requiredSSID?: string
  }
  alreadyCheckedIn?: boolean
  checkInTime?: string
}

interface AttendanceCheckInProps {
  user: {
    id: string
    name: string
    role: string
  }
  onCheckInSuccess: (data: any) => void
  onError: (error: string) => void
  className?: string
}

export const AttendanceCheckIn: React.FC<AttendanceCheckInProps> = ({
  user,
  onCheckInSuccess,
  onError,
  className
}) => {
  const [currentClasses, setCurrentClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStep, setCheckInStep] = useState<'selection' | 'verification' | 'face-recognition' | 'success'>('selection')
  const [wifiStatus, setWifiStatus] = useState<{
    connected: boolean
    ssid?: string
    strength?: number
  }>({ connected: false })
  const [locationStatus, setLocationStatus] = useState<{
    verified: boolean
    coordinates?: { latitude: number; longitude: number }
  }>({ verified: false })

  // Load current classes
  useEffect(() => {
    const loadCurrentClasses = async () => {
      try {
        const response = await fetch('/api/classes/current')
        if (response.ok) {
          const classes = await response.json()
          setCurrentClasses(classes)
          
          // Auto-select if only one class available
          if (classes.length === 1) {
            setSelectedClass(classes[0])
            checkAttendanceEligibility(classes[0])
          }
        }
      } catch (error) {
        console.error('Failed to load classes:', error)
      }
    }

    loadCurrentClasses()
  }, [])

  // Check WiFi status
  useEffect(() => {
    const checkWifiStatus = async () => {
      try {
        // This would typically use a native API or service
        // For demo purposes, we'll simulate wifi detection
        const response = await fetch('/api/attendance/wifi-status')
        if (response.ok) {
          const status = await response.json()
          setWifiStatus(status)
        }
      } catch (error) {
        console.warn('WiFi status check failed:', error)
        // Fallback: assume connected for demo
        setWifiStatus({ connected: true, ssid: 'Campus-WiFi', strength: 85 })
      }
    }

    checkWifiStatus()
    const interval = setInterval(checkWifiStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Get user location
  useEffect(() => {
    const getCurrentLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationStatus({
              verified: true,
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            })
          },
          (error) => {
            console.warn('Location access denied:', error)
            setLocationStatus({ verified: false })
          }
        )
      }
    }

    getCurrentLocation()
  }, [])

  // Check attendance eligibility for selected class
  const checkAttendanceEligibility = useCallback(async (classItem: Class) => {
    try {
      const response = await fetch(`/api/attendance/check-eligibility/${classItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wifiSSID: wifiStatus.ssid,
          location: locationStatus.coordinates
        })
      })

      if (response.ok) {
        const status = await response.json()
        setAttendanceStatus(status)
      } else {
        const error = await response.json()
        setAttendanceStatus({
          canCheckIn: false,
          reason: error.message || 'Unable to verify attendance eligibility'
        })
      }
    } catch (error) {
      setAttendanceStatus({
        canCheckIn: false,
        reason: 'Network error while checking eligibility'
      })
    }
  }, [wifiStatus.ssid, locationStatus.coordinates])

  // Handle class selection
  const handleClassSelect = (classItem: Class) => {
    setSelectedClass(classItem)
    checkAttendanceEligibility(classItem)
  }

  // Start check-in process
  const startCheckIn = () => {
    if (!attendanceStatus?.canCheckIn) return
    setCheckInStep('verification')
    setIsCheckingIn(true)
  }

  // Proceed to face recognition
  const proceedToFaceRecognition = () => {
    setCheckInStep('face-recognition')
  }

  // Handle face capture completion
  const handleFaceCaptureComplete = useCallback(async (faceData: any) => {
    if (!selectedClass) return

    try {
      const checkInData = {
        classId: selectedClass.id,
        faceDescriptor: Array.from(faceData.descriptor),
        confidence: faceData.confidence,
        wifiSSID: wifiStatus.ssid,
        location: locationStatus.coordinates,
        timestamp: new Date().toISOString(),
        method: 'FACE_RECOGNITION'
      }

      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData)
      })

      if (response.ok) {
        const result = await response.json()
        setCheckInStep('success')
        onCheckInSuccess(result)
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record attendance')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to complete check-in')
      setIsCheckingIn(false)
      setCheckInStep('selection')
    }
  }, [selectedClass, wifiStatus.ssid, locationStatus.coordinates, onCheckInSuccess, onError])

  // Reset check-in process
  const resetCheckIn = () => {
    setCheckInStep('selection')
    setIsCheckingIn(false)
    setSelectedClass(null)
    setAttendanceStatus(null)
  }

  // Emergency QR code check-in
  const handleQRCheckIn = () => {
    // This would open a QR code scanner
    alert('QR Code check-in functionality would be implemented here')
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    )
  }

  const renderClassSelection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Available Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentClasses.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No classes available for check-in at this time
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-colors",
                    selectedClass?.id === classItem.id
                      ? "border-slate-800 bg-slate-50 dark:border-slate-400 dark:bg-slate-800"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  )}
                  onClick={() => handleClassSelect(classItem)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">
                        {classItem.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {classItem.code} • {classItem.lecturer}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {classItem.location.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {classItem.schedule.startTime} - {classItem.schedule.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {classItem.enrollmentCount} students
                        </span>
                      </div>
                    </div>
                    {selectedClass?.id === classItem.id && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && attendanceStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Attendance Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(attendanceStatus.canCheckIn)}
                <span className="text-sm">Eligible</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(wifiStatus.connected)}
                <span className="text-sm">WiFi</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(locationStatus.verified)}
                <span className="text-sm">Location</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(!attendanceStatus.alreadyCheckedIn)}
                <span className="text-sm">Not Checked In</span>
              </div>
            </div>

            {/* Detailed Status */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>WiFi Network:</span>
                <span className={cn(
                  wifiStatus.ssid === selectedClass.location.wifiSSID 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {wifiStatus.ssid || 'Not connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Required Network:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {selectedClass.location.wifiSSID}
                </span>
              </div>
              {attendanceStatus.timeWindow && (
                <div className="flex justify-between">
                  <span>Check-in Window:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {attendanceStatus.timeWindow.opensAt} - {attendanceStatus.timeWindow.closesAt}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {!attendanceStatus.canCheckIn && attendanceStatus.reason && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {attendanceStatus.reason}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={startCheckIn}
                disabled={!attendanceStatus.canCheckIn}
                variant="chalk"
                size="lg"
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Face Check-in
              </Button>
              
              <Button 
                onClick={handleQRCheckIn}
                variant="chalkOutline"
                size="lg"
              >
                <QrCode className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={() => checkAttendanceEligibility(selectedClass)}
                variant="ghost"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderVerification = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Pre-Check Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Ready for Check-in</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            All requirements verified. Proceed to face recognition.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Class
            </span>
            <span className="font-medium">{selectedClass?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network
            </span>
            <span className="font-medium">{wifiStatus.ssid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </span>
            <span className="font-medium">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={() => setCheckInStep('selection')}
            variant="chalkOutline"
            size="lg"
          >
            Back
          </Button>
          <Button 
            onClick={proceedToFaceRecognition}
            variant="chalk"
            size="lg"
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Proceed to Face Recognition
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderFaceRecognition = () => (
    <div className="space-y-6">
      <FaceCapture
        mode="attendance"
        onCaptureComplete={handleFaceCaptureComplete}
        onError={onError}
      />
      
      <div className="text-center">
        <Button 
          onClick={() => setCheckInStep('verification')}
          variant="chalkOutline"
          size="lg"
        >
          Back to Verification
        </Button>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <Card>
      <CardContent className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Check-in Successful!
        </h3>
        
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Your attendance has been recorded for {selectedClass?.name}
        </p>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Time:</span>
              <p className="font-medium">{new Date().toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Method:</span>
              <p className="font-medium">Face Recognition</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={resetCheckIn}
          variant="chalk"
          size="lg"
        >
          Check in to Another Class
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Progress Indicator */}
      {isCheckingIn && (
        <div className="mb-6">
          <Progress 
            value={
              checkInStep === 'verification' ? 33 :
              checkInStep === 'face-recognition' ? 66 :
              checkInStep === 'success' ? 100 : 0
            } 
          />
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 text-center">
            Step {
              checkInStep === 'verification' ? 1 :
              checkInStep === 'face-recognition' ? 2 :
              checkInStep === 'success' ? 3 : 0
            } of 3: {
              checkInStep === 'verification' ? 'Verification' :
              checkInStep === 'face-recognition' ? 'Face Recognition' :
              checkInStep === 'success' ? 'Complete' : ''
            }
          </p>
        </div>
      )}

      {/* Step Content */}
      {checkInStep === 'selection' && renderClassSelection()}
      {checkInStep === 'verification' && renderVerification()}
      {checkInStep === 'face-recognition' && renderFaceRecognition()}
      {checkInStep === 'success' && renderSuccess()}
    </div>
  )
}