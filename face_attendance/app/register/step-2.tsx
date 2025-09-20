'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePixelToast, PixelToastContainer } from '@/components/ui/pixel-toast'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  EyeIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { validateFile, FILE_TYPES, MAX_FILE_SIZE, detectDocumentType, extractDocumentInfo } from '@/lib/file-utils'
import { verifyCloudinaryUpload } from '@/lib/cloudinary-utils'
import { useAuthStore } from '@/store/auth-store'
import Tesseract from 'tesseract.js'

interface DocumentData {
  ktm: File | null
  ktmText?: string
}

interface RegistrationStep2Props {
  onNext: (data: DocumentData) => void
  onBack: () => void
  registrationId?: string
  initialData?: Partial<DocumentData>
  step1Data?: any // Data from step 1 including userId
}

export function RegistrationStep2({ onNext, onBack, initialData, step1Data }: RegistrationStep2Props) {
  const [documentData, setDocumentData] = useState<DocumentData>({
    ktm: null,
    ...initialData
  })
  const [isLoading, setIsLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<{ [key: string]: number }>({})
  const [ocrResults, setOcrResults] = useState<{ [key: string]: string }>({})
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const ktmInputRef = useRef<HTMLInputElement>(null)
  const toast = usePixelToast()
  const { user, token } = useAuthStore()

  const performOCR = async (file: File, documentType: string) => {
    try {
      setOcrProgress(prev => ({ ...prev, [documentType]: 0 }))

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100)
            setOcrProgress(prev => ({ ...prev, [documentType]: progress }))
          }
        }
      })

      const extractedText = result.data.text.trim()
      setOcrResults(prev => ({ ...prev, [documentType]: extractedText }))

      // Check document quality first
      if (extractedText.length < 20) {
        setErrors(prev => ({
          ...prev,
          [documentType]: 'Document quality is too poor or text is too small. Please upload a clearer, higher resolution image.'
        }))
        toast.error('Document quality is poor', 'Upload a clearer image')
        return
      }

      // Auto-detect document type and validate
      const detection = detectDocumentType(extractedText)
      const expectedType = documentType === 'ktm' ? 'ktm' : documentType === 'idCard' ? 'ktp' : 'unknown'

      // Check document quality first using the improved quality score
      if (detection.qualityScore < 0.3) {
        setErrors(prev => ({
          ...prev,
          [documentType]: 'Document quality is too poor. Please upload a clearer, higher resolution image with better lighting.'
        }))
        toast.error('Poor document quality detected', 'Upload a clearer image')
        return
      }

      if (detection.type !== expectedType && detection.confidence > 0.3) {
        setErrors(prev => ({
          ...prev,
          [documentType]: `This appears to be a ${detection.type.toUpperCase()} document, but you selected ${expectedType.toUpperCase()}`
        }))
        toast.error('Wrong document type detected', 'Please upload the correct document')
        return
      } else if (detection.confidence < 0.15) {
        setErrors(prev => ({
          ...prev,
          [documentType]: 'Document type cannot be clearly determined. Please upload a clearer image of your Student ID Card.'
        }))
        toast.error('Document unclear', 'Cannot identify document type')
        return
      }

      // Extract information from document
      const info = extractDocumentInfo(extractedText, detection.type as 'ktm' | 'ktp')
      console.log('Extracted info:', info)

      // Validate against step1 data if available
      if (step1Data && info) {
        let validationErrors: string[] = []

        // Check name similarity
        if (info.name && step1Data.name) {
          const similarity = calculateNameSimilarity(info.name, step1Data.name)
          if (similarity < 0.6) {
            validationErrors.push(`Name mismatch: Document shows "${info.name}" but registration shows "${step1Data.name}"`)
          }
        }

        // Check student ID
        if (info.studentId && step1Data.studentId) {
          if (!info.studentId.includes(step1Data.studentId) && !step1Data.studentId.includes(info.studentId)) {
            validationErrors.push(`Student ID mismatch: Document shows "${info.studentId}" but registration shows "${step1Data.studentId}"`)
          }
        }

        if (validationErrors.length > 0) {
          setErrors(prev => ({
            ...prev,
            [documentType]: validationErrors.join('. ')
          }))
          toast.error('Document information mismatch', 'Please verify your details')
          return
        } else {
          toast.success('Document validated successfully', 'Information matches registration')
        }
      }

      setErrors(prev => ({ ...prev, [documentType]: '' }))
      setOcrProgress(prev => ({ ...prev, [documentType]: 100 }))

    } catch (error) {
      console.error('OCR Error:', error)
      setErrors(prev => ({
        ...prev,
        [documentType]: 'Failed to read document. Please ensure the image is clear and try again.'
      }))
      setOcrProgress(prev => ({ ...prev, [documentType]: 0 }))
      toast.error('OCR processing failed', 'Please try uploading again')
    }
  }

  // Helper function to calculate name similarity
  const calculateNameSimilarity = (name1: string, name2: string): number => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z]/g, ' ').replace(/\s+/g, ' ').trim()
    const norm1 = normalize(name1)
    const norm2 = normalize(name2)

    const words1 = norm1.split(' ')
    const words2 = norm2.split(' ')

    let matches = 0
    words1.forEach(word1 => {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        matches++
      }
    })

    return matches / Math.max(words1.length, words2.length)
  }


  const handleFileUpload = async (file: File, documentType: keyof DocumentData) => {
    if (!file) return

    // Validate file using utility function for documents (images + PDF)
    const validation = validateFile(file, FILE_TYPES.DOCUMENTS, MAX_FILE_SIZE.DOCUMENT)
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [documentType]: validation.error || 'Invalid file'
      }))
      return
    }

    setDocumentData(prev => ({ ...prev, [documentType]: file }))
    setErrors(prev => ({ ...prev, [documentType]: '' }))

    // Perform OCR for image documents only (not PDF or selfie)
    if (documentType !== 'selfie' && file.type.startsWith('image/')) {
      await performOCR(file, documentType)
    } else if (file.type === 'application/pdf') {
      // For PDF files, show a message that OCR is not available
      setOcrResults(prev => ({
        ...prev,
        [documentType]: 'PDF uploaded successfully. Text extraction not available for PDF files.'
      }))
    }
  }

  const handleSubmit = async () => {
    if (!documentData.ktm) {
      toast.error('Please upload your Student ID Card (KTM)')
      return
    }

    // Check for OCR errors
    const hasErrors = Object.values(errors).some(error => error !== '')
    if (hasErrors) {
      toast.error('Please resolve document validation errors before continuing')
      return
    }

    // Validate that we have user data from step 1
    if (!step1Data) {
      toast.error('User data from step 1 not found. Please restart registration.')
      return
    }

    setIsLoading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()

      // Add KTM file
      formData.append('ktm', documentData.ktm)

      // Add OCR results
      if (ocrResults.ktm) {
        formData.append('ktmText', ocrResults.ktm)
      }

      // Get user ID from step 1 data (should be available if step 1 completed successfully)
      const userId = step1Data?.userId

      if (!userId) {
        throw new Error('User ID not found. Please restart registration from step 1.')
      }

      formData.append('userId', userId)

      // Upload to API
      const response = await fetch('/api/registration/documents', {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      toast.success('Student ID Card uploaded successfully!', 'Upload Complete')

      // Verify upload in Cloudinary (optional during registration)
      if (result.publicId) {
        try {
          const verification = await verifyCloudinaryUpload(result.publicId)
          if (verification.exists) {
            toast.info('Upload verified on cloud storage', 'Verification Complete')
          }
        } catch (error) {
          // Ignore verification errors during registration
          console.log('Cloudinary verification skipped during registration')
        }
      }

      // Pass the result to next step
      const dataWithUploadInfo = {
        ...documentData,
        ktmText: ocrResults.ktm,
        uploadResult: result
      }

      onNext(dataWithUploadInfo)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload document', 'Upload Failed')
    } finally {
      setIsLoading(false)
    }
  }

  const renderFileUpload = (
    documentType: keyof DocumentData,
    label: string,
    description: string,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const file = documentData[documentType] as File | null
    const progress = ocrProgress[documentType] || 0
    const hasError = errors[documentType]
    const ocrResult = ocrResults[documentType]

    return (
      <Card className="pixel-card hover-pixel">
        <CardHeader>
          <CardTitle className="heading-pixel-3 flex items-center">
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            {label}
          </CardTitle>
          <p className="text-pixel-small text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              file ? "border-foreground bg-background" : "border-border hover:border-foreground",
              hasError && "border-destructive"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) {
                  handleFileUpload(selectedFile, documentType)
                }
              }}
            />

            {file ? (
              <div className="space-y-3">
                {file.type === 'application/pdf' ? (
                  <DocumentIcon className="w-4 h-4 text-foreground mx-auto" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-foreground mx-auto" />
                )}
                <p className="text-pixel font-medium">{file.name}</p>
                <p className="text-pixel-small text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type === 'application/pdf' ? 'PDF Document' : 'Image File'}
                </p>

                {progress > 0 && progress < 100 && (
                  <div className="space-y-2">
                    <p className="text-pixel-small">Reading document...</p>
                    <Progress value={progress} className="h-2" />
                    <p className="text-pixel-small text-muted-foreground">{progress}%</p>
                  </div>
                )}

                {progress === 100 && ocrResult && (
                  <div className="mt-4 p-3 bg-muted rounded text-left">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-pixel-small font-medium">Document Analysis:</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Show full text in modal or expand
                        }}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Document Quality Indicator */}
                    <div className="mb-2">
                      <p className="text-pixel-small font-medium">Quality Score:</p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          ocrResult.length > 100 ? "bg-green-500" :
                          ocrResult.length > 50 ? "bg-yellow-500" : "bg-red-500"
                        )}></div>
                        <span className="text-pixel-small">
                          {ocrResult.length > 100 ? "Excellent" :
                           ocrResult.length > 50 ? "Good" : "Poor"}
                        </span>
                      </div>
                    </div>

                    {/* Validation Status */}
                    {step1Data && (
                      <div className="mb-2">
                        <p className="text-pixel-small font-medium">Validation:</p>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            !hasError ? "bg-green-500" : "bg-red-500"
                          )}></div>
                          <span className="text-pixel-small">
                            {!hasError ? "Information matches registration" : "Please verify details"}
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-pixel-small text-muted-foreground line-clamp-3">
                      {ocrResult.substring(0, 150)}...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <CloudArrowUpIcon className="w-4 h-4 text-muted-foreground mx-auto" />
                <p className="text-pixel">Click to upload {label.toLowerCase()}</p>
                <p className="text-pixel-small text-muted-foreground">
                  JPG, PNG, WEBP, PDF up to 10MB
                </p>
              </div>
            )}
          </div>

          {hasError && (
            <Alert variant="destructive" className="pixel-frame">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription className="text-pixel-small">{hasError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <PixelToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center space-pixel-lg">
        <h2 className="heading-pixel-1">Document Upload</h2>
        <p className="text-pixel">Step 2 of 4 - Upload your identification documents</p>
      </div>

      {/* Document Upload Form */}
      <div className="space-y-6">
        {renderFileUpload(
          'ktm',
          'Student ID Card (KTM)',
          'Upload a clear photo of your Student ID Card for verification',
          ktmInputRef
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="btn-pixel flex-1"
          disabled={isLoading}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="btn-pixel flex-1"
          disabled={isLoading || !documentData.ktm}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              Continue to Face Enrollment
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-pixel-small text-muted-foreground">
          Make sure your Student ID Card is clear and readable. Our system will automatically verify the information.
        </p>
      </div>
      </div>
    </>
  )
}