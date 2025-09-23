'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { FaceCapture } from '@/components/face/FaceCapture'
import { usePixelToast, PixelToastContainer } from '@/components/ui/pixel-toast'

interface FaceEnrollmentData {
  faceImages: string[]
  enrollmentQuality: number
  enrollmentStatus: 'pending' | 'completed' | 'failed'
  timestamp: string
}

interface RegistrationStep3Props {
  onNext: (data: FaceEnrollmentData) => void
  onBack: () => void
  registrationId?: string
  initialData?: FaceEnrollmentData
  step1Data?: any
  step2Data?: any
}

export function RegistrationStep3({
  onNext,
  onBack,
  registrationId,
  initialData,
  step1Data,
  step2Data
}: RegistrationStep3Props) {
  const [faceImages, setFaceImages] = useState<string[]>(initialData?.faceImages || [])
  const [currentStep, setCurrentStep] = useState<'capture' | 'review' | 'complete'>('capture')
  const [enrollmentQuality, setEnrollmentQuality] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = usePixelToast()

  const requiredImages = 3 // Require 3 face images for better enrollment

  const handleFaceCapture = async (imageData: string) => {
    try {
      setIsProcessing(true)
      setError(null)

      // Add the captured image to our collection
      const newImages = [...faceImages, imageData]
      setFaceImages(newImages)

      // Simulate face quality analysis
      const quality = Math.floor(Math.random() * 30) + 70 // 70-100% quality
      setEnrollmentQuality(Math.max(enrollmentQuality, quality))

      toast.success(`Face ${newImages.length}/${requiredImages} captured successfully!`, 'Capture Complete')

      if (newImages.length >= requiredImages) {
        setCurrentStep('review')
      }

    } catch (error) {
      console.error('Face capture error:', error)
      setError('Failed to process face capture. Please try again.')
      toast.error('Failed to capture face', 'Please try again')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCaptureError = (error: string) => {
    setError(error)
    toast.error('Camera Error', error)
  }

  const handleRetakeImage = (index: number) => {
    const newImages = faceImages.filter((_, i) => i !== index)
    setFaceImages(newImages)
    setCurrentStep('capture')
    toast.info('Image removed', 'Capture a new one')
  }

  const handleCompleteEnrollment = async () => {
    setIsProcessing(true)

    try {
      // Simulate enrollment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const enrollmentData: FaceEnrollmentData = {
        faceImages,
        enrollmentQuality,
        enrollmentStatus: 'completed',
        timestamp: new Date().toISOString()
      }

      console.log('Step 3 enrollment data:', {
        faceImagesCount: faceImages.length,
        enrollmentQuality,
        enrollmentStatus: 'completed'
      })

      toast.success('Face enrollment completed successfully!', 'Enrollment Complete')
      onNext(enrollmentData)

    } catch (error) {
      console.error('Enrollment error:', error)
      setError('Failed to complete face enrollment. Please try again.')
      toast.error('Enrollment failed', 'Please try again')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderCaptureStep = () => (
    <div className="space-y-6">
      <div className="text-center space-pixel-lg">
        <h2 className="heading-pixel-1">Face Enrollment</h2>
        <p className="text-pixel">Step 3 of 4 - Capture your face for biometric enrollment</p>
        <p className="text-pixel-small text-muted-foreground">
          Progress: {faceImages.length}/{requiredImages} images captured
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="pixel-frame">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-pixel-small">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="pixel-card hover-pixel">
        <CardHeader>
          <CardTitle className="heading-pixel-3 flex items-center">
            <Camera className="w-4 h-4 mr-2" />
            Face Capture {faceImages.length + 1}/{requiredImages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FaceCapture
            onCapture={handleFaceCapture}
            onError={handleCaptureError}
            showPreview={false}
          />
        </CardContent>
      </Card>

      {faceImages.length > 0 && (
        <Card className="pixel-card">
          <CardHeader>
            <CardTitle className="heading-pixel-3">Captured Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {faceImages.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Face ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-green-500"
                  />
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute bottom-1 left-1 h-6 px-2 text-xs"
                    onClick={() => handleRetakeImage(index)}
                  >
                    Retake
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center space-pixel-lg">
        <h2 className="heading-pixel-1">Review Face Enrollment</h2>
        <p className="text-pixel">Review your captured images before completing enrollment</p>
      </div>

      <Card className="pixel-card">
        <CardHeader>
          <CardTitle className="heading-pixel-3">Enrollment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {faceImages.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Face ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-pixel font-medium">Enrollment Quality:</span>
              <span className={`text-pixel font-bold ${
                enrollmentQuality > 85 ? 'text-green-600' :
                enrollmentQuality > 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {enrollmentQuality}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  enrollmentQuality > 85 ? 'bg-green-500' :
                  enrollmentQuality > 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${enrollmentQuality}%` }}
              />
            </div>
          </div>

          {step1Data && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-pixel font-medium mb-2">Registration Info:</h4>
              <div className="text-pixel-small space-y-1">
                <p><strong>Name:</strong> {step1Data.name}</p>
                <p><strong>ID:</strong> {step1Data.studentId}</p>
                <p><strong>Role:</strong> {step1Data.role}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={() => {
            setCurrentStep('capture')
            setError(null)
          }}
          variant="outline"
          className="btn-pixel flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Capture More
        </Button>
        <Button
          onClick={handleCompleteEnrollment}
          disabled={isProcessing || enrollmentQuality < 50}
          className="btn-pixel flex-1"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              Complete Enrollment
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <PixelToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="space-y-8">
        {currentStep === 'capture' && renderCaptureStep()}
        {currentStep === 'review' && renderReviewStep()}

        {/* Navigation - only show back button on capture step */}
        {currentStep === 'capture' && (
          <div className="flex gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="btn-pixel flex-1"
              disabled={isProcessing}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-pixel-small text-muted-foreground">
            Your face data will be securely stored and used only for attendance verification.
          </p>
        </div>
      </div>
    </>
  )
}

export default RegistrationStep3