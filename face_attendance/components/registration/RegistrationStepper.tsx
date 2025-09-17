import React, { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RegistrationProgress } from '@/components/ui/progress'
import { FaceCapture } from '@/components/attendance/FaceCapture'
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
  User, 
  Upload, 
  Camera, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Mail,
  Phone,
  IdCard,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation Schemas
const basicInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['STUDENT', 'LECTURER']),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().min(2, 'Department is required'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  gdprConsent: z.boolean().refine(val => val === true, 'You must consent to biometric data processing')
})

const documentSchema = z.object({
  documentType: z.enum(['STUDENT_ID', 'STAFF_ID', 'PASSPORT']),
  documentFile: z.instanceof(File).optional(),
  documentNumber: z.string().min(5, 'Document number is required')
})

// Types
interface RegistrationData {
  basicInfo: z.infer<typeof basicInfoSchema>
  document: z.infer<typeof documentSchema> & { file?: File }
  faceData: {
    descriptor: Float32Array
    image: string
    confidence: number
  } | null
  verification: {
    emailVerified: boolean
    phoneVerified: boolean
    otp?: string
  }
}

interface RegistrationStepperProps {
  onComplete: (data: RegistrationData) => void
  onError: (error: string) => void
  existingDescriptors?: Float32Array[]
  className?: string
}

const REGISTRATION_STEPS = [
  'Basic Information',
  'Document Verification', 
  'Face Enrollment',
  'Verification Complete'
]

export const RegistrationStepper: React.FC<RegistrationStepperProps> = ({
  onComplete,
  onError,
  existingDescriptors = [],
  className
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    basicInfo: {} as any,
    document: {} as any,
    faceData: null,
    verification: {
      emailVerified: false,
      phoneVerified: false
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null)

  // Form instances for each step
  const basicInfoForm = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      termsAccepted: false,
      gdprConsent: false
    }
  })

  const documentForm = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema)
  })

  // Step 1: Basic Information
  const handleBasicInfoSubmit = useCallback(async (data: z.infer<typeof basicInfoSchema>) => {
    setIsSubmitting(true)
    try {
      // Validate email domain for students
      if (data.role === 'STUDENT' && !data.email.includes('student.')) {
        throw new Error('Student email must contain "student." domain')
      }

      // Check for existing user
      const checkResponse = await fetch('/api/auth/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, studentId: data.studentId })
      })

      if (!checkResponse.ok) {
        const error = await checkResponse.json()
        throw new Error(error.message || 'Failed to validate user information')
      }

      setRegistrationData(prev => ({ ...prev, basicInfo: data }))
      setCurrentStep(2)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to submit basic information')
    } finally {
      setIsSubmitting(false)
    }
  }, [onError])

  // Step 2: Document Upload and Verification
  const handleDocumentUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onError('File size must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      onError('Please upload an image file')
      return
    }

    setUploadedDocument(file)

    // Optional: OCR processing
    try {
      const formData = new FormData()
      formData.append('document', file)
      formData.append('documentType', documentForm.getValues('documentType'))

      const ocrResponse = await fetch('/api/documents/ocr', {
        method: 'POST',
        body: formData
      })

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json()
        // Auto-fill form fields based on OCR results
        if (ocrData.documentNumber) {
          documentForm.setValue('documentNumber', ocrData.documentNumber)
        }
      }
    } catch (error) {
      console.warn('OCR processing failed:', error)
    }
  }, [documentForm, onError])

  const handleDocumentSubmit = useCallback(async (data: z.infer<typeof documentSchema>) => {
    if (!uploadedDocument) {
      onError('Please upload a document')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('document', uploadedDocument)
      formData.append('documentType', data.documentType)
      formData.append('documentNumber', data.documentNumber)
      formData.append('userId', 'temp-user-id') // Will be replaced with actual user ID

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload document')
      }

      setRegistrationData(prev => ({
        ...prev,
        document: { ...data, file: uploadedDocument }
      }))
      setCurrentStep(3)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setIsSubmitting(false)
    }
  }, [uploadedDocument, onError])

  // Step 3: Face Enrollment
  const handleFaceCaptureComplete = useCallback(async (faceData: any) => {
    setIsSubmitting(true)
    try {
      // Submit face data to backend
      const response = await fetch('/api/face/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descriptor: Array.from(faceData.descriptor),
          image: faceData.image,
          confidence: faceData.confidence,
          quality: faceData.quality
        })
      })

      if (!response.ok) {
        throw new Error('Failed to enroll face data')
      }

      setRegistrationData(prev => ({
        ...prev,
        faceData: {
          descriptor: faceData.descriptor,
          image: faceData.image,
          confidence: faceData.confidence
        }
      }))
      setCurrentStep(4)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to enroll face data')
    } finally {
      setIsSubmitting(false)
    }
  }, [onError])

  // Step 4: Email and Phone Verification
  const handleVerificationComplete = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // Submit complete registration
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      })

      if (!response.ok) {
        throw new Error('Failed to complete registration')
      }

      const result = await response.json()
      onComplete({ ...registrationData, verification: { ...registrationData.verification, ...result } })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to complete registration')
    } finally {
      setIsSubmitting(false)
    }
  }, [registrationData, onComplete, onError])

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...basicInfoForm}>
                <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={basicInfoForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicInfoForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={basicInfoForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email address" 
                            icon={<Mail className="w-4 h-4" />}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Use your official institutional email address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicInfoForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter your phone number" 
                            icon={<Phone className="w-4 h-4" />}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicInfoForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STUDENT">Student</SelectItem>
                            <SelectItem value="LECTURER">Lecturer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {basicInfoForm.watch('role') === 'STUDENT' && (
                    <FormField
                      control={basicInfoForm.control}
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student ID</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your student ID" 
                              icon={<IdCard className="w-4 h-4" />}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {basicInfoForm.watch('role') === 'LECTURER' && (
                    <FormField
                      control={basicInfoForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your employee ID" 
                              icon={<IdCard className="w-4 h-4" />}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={basicInfoForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <FormField
                      control={basicInfoForm.control}
                      name="termsAccepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I agree to the Terms and Conditions
                            </FormLabel>
                            <FormDescription>
                              By checking this box, you agree to our terms of service and privacy policy.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicInfoForm.control}
                      name="gdprConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I consent to biometric data processing
                            </FormLabel>
                            <FormDescription>
                              By checking this box, you consent to the collection and processing of your facial biometric data for attendance purposes in accordance with GDPR regulations.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      variant="chalk"
                      size="lg"
                    >
                      {isSubmitting ? 'Processing...' : 'Continue'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...documentForm}>
                <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)} className="space-y-6">
                  <FormField
                    control={documentForm.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STUDENT_ID">Student ID Card</SelectItem>
                            <SelectItem value="STAFF_ID">Staff ID Card</SelectItem>
                            <SelectItem value="PASSPORT">Passport</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={documentForm.control}
                    name="documentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter document number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the identification number from your document
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Document Upload Area */}
                  <div className="space-y-4">
                    <FormLabel>Upload Document</FormLabel>
                    <div
                      className={cn(
                        "border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center transition-colors",
                        "hover:border-slate-400 dark:hover:border-slate-500",
                        uploadedDocument && "border-green-500 bg-green-50 dark:bg-green-900/20"
                      )}
                      onDrop={(e) => {
                        e.preventDefault()
                        const files = Array.from(e.dataTransfer.files)
                        if (files[0]) handleDocumentUpload(files[0])
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleDocumentUpload(file)
                        }}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        {uploadedDocument ? (
                          <div>
                            <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                              Document uploaded successfully
                            </p>
                            <p className="text-sm text-slate-500">{uploadedDocument.name}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-600 dark:text-slate-400 mb-2">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-slate-500">
                              PNG, JPG, or JPEG (max 5MB)
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Document Guidelines
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Ensure the document is clear and well-lit</li>
                      <li>• All text should be readable</li>
                      <li>• Photo should be visible and unobstructed</li>
                      <li>• Document should be flat and not folded</li>
                    </ul>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      onClick={goToPreviousStep}
                      variant="chalkOutline"
                      size="lg"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !uploadedDocument}
                      variant="chalk"
                      size="lg"
                    >
                      {isSubmitting ? 'Uploading...' : 'Continue'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Face Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Face Enrollment Instructions
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Ensure good lighting on your face</li>
                      <li>• Remove glasses, hats, or face coverings</li>
                      <li>• Look directly at the camera</li>
                      <li>• Follow the on-screen instructions for different poses</li>
                      <li>• Stay still during capture</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FaceCapture
              mode="enrollment"
              onCaptureComplete={handleFaceCaptureComplete}
              onError={onError}
              existingDescriptors={existingDescriptors}
              requiredPoses={3}
            />

            <div className="flex justify-between">
              <Button 
                type="button" 
                onClick={goToPreviousStep}
                variant="chalkOutline"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Registration Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Registration Submitted Successfully!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your registration has been submitted for review. You will receive an email notification once your account has been approved.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg space-y-4">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3">
                  Next Steps:
                </h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 text-blue-500" />
                    Check your email for verification link
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                    Admin will review your documents and face enrollment
                  </li>
                  <li className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 text-purple-500" />
                    You'll receive approval notification within 24-48 hours
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button 
                  onClick={handleVerificationComplete}
                  disabled={isSubmitting}
                  variant="chalk"
                  size="lg"
                >
                  {isSubmitting ? 'Finalizing...' : 'Complete Registration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <RegistrationProgress 
          currentStep={currentStep}
          totalSteps={4}
          steps={REGISTRATION_STEPS}
        />
      </div>

      {/* Step Content */}
      {renderStepContent()}
    </div>
  )
}