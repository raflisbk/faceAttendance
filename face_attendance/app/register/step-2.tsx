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

interface OCREditData {
  name: string
  studentId: string
  university: string
  program: string
  extractedText: string
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
  const [ocrEditData, setOcrEditData] = useState<OCREditData>({
    name: '',
    studentId: '',
    university: '',
    program: '',
    extractedText: ''
  })
  const [showOcrEditor, setShowOcrEditor] = useState(false)
  const [ocrDataEdited, setOcrDataEdited] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const ktmInputRef = useRef<HTMLInputElement>(null)
  const toast = usePixelToast()
  const { user, token } = useAuthStore()


  // Function to parse KTM text and extract structured information
  const parseKTMText = (text: string): OCREditData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    let name = ''
    let studentId = ''
    let university = ''
    let program = ''

    // Common patterns for KTM parsing
    const namePatterns = [
      /nama\s*:?\s*(.+)/i,
      /name\s*:?\s*(.+)/i,
      /^([A-Z][a-z]+ [A-Z][a-z]+.*?)$/m
    ]

    const studentIdPatterns = [
      /nim\s*:?\s*([A-Z0-9]+)/i,
      /nomor\s*induk\s*:?\s*([A-Z0-9]+)/i,
      /student\s*id\s*:?\s*([A-Z0-9]+)/i,
      /([0-9]{8,})/
    ]

    const universityPatterns = [
      /universitas\s+(.+)/i,
      /university\s+(.+)/i,
      /institut\s+(.+)/i
    ]

    const programPatterns = [
      /program\s*studi\s*:?\s*(.+)/i,
      /faculty\s*:?\s*(.+)/i,
      /jurusan\s*:?\s*(.+)/i
    ]

    // Extract information using patterns
    for (const line of lines) {
      // Try to find name
      if (!name) {
        for (const pattern of namePatterns) {
          const match = line.match(pattern)
          if (match && match[1] && match[1].length > 2) {
            name = match[1].trim()
            break
          }
        }
      }

      // Try to find student ID
      if (!studentId) {
        for (const pattern of studentIdPatterns) {
          const match = line.match(pattern)
          if (match && match[1]) {
            studentId = match[1].trim()
            break
          }
        }
      }

      // Try to find university
      if (!university) {
        for (const pattern of universityPatterns) {
          const match = line.match(pattern)
          if (match && match[1]) {
            university = match[1].trim()
            break
          }
        }
      }

      // Try to find program
      if (!program) {
        for (const pattern of programPatterns) {
          const match = line.match(pattern)
          if (match && match[1]) {
            program = match[1].trim()
            break
          }
        }
      }
    }

    return {
      name,
      studentId,
      university,
      program,
      extractedText: text
    }
  }

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

      // Parse OCR results into structured data
      if (documentType === 'ktm') {
        const parsedData = parseKTMText(extractedText)
        setOcrEditData(parsedData)
        setShowOcrEditor(true)
      }

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

    // Perform OCR for image documents only (not PDF)
    if (file.type.startsWith('image/')) {
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

    // Check for OCR errors, but skip if user has manually edited OCR data
    const hasErrors = Object.values(errors).some(error => error !== '')
    if (hasErrors && !ocrDataEdited) {
      toast.error('Please resolve document validation errors before continuing, or edit the OCR results manually')
      return
    }

    // If OCR data was manually edited, validate minimum required fields
    if (ocrDataEdited) {
      if (!ocrEditData.name.trim() || !ocrEditData.studentId.trim()) {
        toast.error('Name and Student ID are required when manually editing OCR results')
        setShowOcrEditor(true)
        return
      }
    }

    // Validate that we have user data from step 1
    if (!step1Data) {
      toast.error('User data from step 1 not found. Please restart registration.')
      return
    }

    setIsLoading(true)

    try {
      // Get registration ID from step 1 data
      const registrationId = step1Data?.registrationId

      if (!registrationId) {
        throw new Error('Registration ID not found. Please restart registration from step 1.')
      }

      // Convert file to base64 for temporary storage (no Cloudinary upload yet)
      const fileBuffer = await documentData.ktm.arrayBuffer()
      const base64Data = Buffer.from(fileBuffer).toString('base64')

      toast.success('Student ID Card processed successfully!', 'Processing Complete')

      // Prepare document data for temporary storage (no upload yet)
      const documentInfo = {
        registrationId,
        fileName: documentData.ktm.name,
        fileSize: documentData.ktm.size,
        mimeType: documentData.ktm.type,
        documentType: 'STUDENT_ID',
        fileData: base64Data, // Store file data temporarily
        ocrData: showOcrEditor ? ocrEditData : {
          extractedText: ocrResults.ktm || ''
        },
        processedAt: new Date().toISOString()
      }

      // Pass the document info to next step (upload to Cloudinary will happen at final step)
      const dataWithUploadInfo = {
        ...documentData,
        ktmText: showOcrEditor ? JSON.stringify(ocrEditData) : ocrResults.ktm,
        document: documentInfo
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
    inputRef: React.RefObject<HTMLInputElement | null>
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
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowOcrEditor(true)
                          }}
                          title="Edit OCR Results"
                        >
                          ✏️
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Show full text in modal or expand
                          }}
                          title="View Full Text"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </div>
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
                            ocrDataEdited ? "bg-blue-500" :
                            !hasError ? "bg-green-500" : "bg-red-500"
                          )}></div>
                          <span className="text-pixel-small">
                            {ocrDataEdited ? "Manually edited - validation bypassed" :
                             !hasError ? "Information matches registration" : "Please verify details"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Manual Edit Status */}
                    {ocrDataEdited && (
                      <div className="mb-2">
                        <p className="text-pixel-small font-medium">Status:</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-pixel-small text-blue-400">
                            OCR data has been manually reviewed and edited
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

        {/* OCR Results Editor */}
        {showOcrEditor && (
          <Card className="pixel-card hover-pixel">
            <CardHeader>
              <CardTitle className="heading-pixel-3 flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  Review OCR Results
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOcrEditor(false)}
                >
                  ✕
                </Button>
              </CardTitle>
              <p className="text-pixel-small text-muted-foreground">
                Please review and edit the information extracted from your Student ID Card
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ocrName" className="text-pixel">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ocrName"
                    value={ocrEditData.name}
                    onChange={(e) => setOcrEditData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    className={cn(
                      "input-pixel",
                      !ocrEditData.name.trim() && "border-red-500"
                    )}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ocrStudentId" className="text-pixel">
                    Student ID (NIM) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ocrStudentId"
                    value={ocrEditData.studentId}
                    onChange={(e) => setOcrEditData(prev => ({ ...prev, studentId: e.target.value }))}
                    placeholder="Enter your student ID"
                    className={cn(
                      "input-pixel",
                      !ocrEditData.studentId.trim() && "border-red-500"
                    )}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ocrUniversity" className="text-pixel">
                    University
                  </Label>
                  <Input
                    id="ocrUniversity"
                    value={ocrEditData.university}
                    onChange={(e) => setOcrEditData(prev => ({ ...prev, university: e.target.value }))}
                    placeholder="Enter your university name"
                    className="input-pixel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ocrProgram" className="text-pixel">
                    Program/Faculty
                  </Label>
                  <Input
                    id="ocrProgram"
                    value={ocrEditData.program}
                    onChange={(e) => setOcrEditData(prev => ({ ...prev, program: e.target.value }))}
                    placeholder="Enter your program or faculty"
                    className="input-pixel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ocrExtractedText" className="text-pixel">
                  Extracted Text (Original OCR Result)
                </Label>
                <div className="relative">
                  <textarea
                    id="ocrExtractedText"
                    value={ocrEditData.extractedText}
                    onChange={(e) => setOcrEditData(prev => ({ ...prev, extractedText: e.target.value }))}
                    placeholder="Full text extracted from the document"
                    className="input-pixel min-h-[120px] resize-y"
                    rows={5}
                  />
                </div>
                <p className="text-pixel-small text-muted-foreground">
                  This is the raw text extracted from your document. You can edit it if needed.
                </p>
              </div>

              {/* Validation against step 1 data */}
              {step1Data && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-pixel font-medium mb-2">Validation Check:</h4>
                  <div className="space-y-1 text-pixel-small">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        ocrEditData.name.toLowerCase().includes(step1Data.name?.toLowerCase() || '') ||
                        step1Data.name?.toLowerCase().includes(ocrEditData.name.toLowerCase())
                          ? "bg-green-500" : "bg-orange-500"
                      )}></div>
                      <span>Name: {ocrEditData.name} vs {step1Data.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        ocrEditData.studentId === step1Data.studentId ? "bg-green-500" : "bg-orange-500"
                      )}></div>
                      <span>Student ID: {ocrEditData.studentId} vs {step1Data.studentId}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset to original OCR results and clear edited state
                    const originalData = parseKTMText(ocrResults.ktm || '')
                    setOcrEditData(originalData)
                    setOcrDataEdited(false)
                    // Check if original data would have validation errors
                    const detection = detectDocumentType(ocrResults.ktm || '')
                    if (detection.confidence < 0.15) {
                      setErrors(prev => ({ ...prev, ktm: 'Document type cannot be clearly determined. Please upload a clearer image of your Student ID Card.' }))
                    } else {
                      setErrors(prev => ({ ...prev, ktm: '' }))
                    }
                  }}
                  className="btn-pixel flex-1"
                >
                  Reset to Original
                </Button>
                <Button
                  onClick={() => {
                    // Mark as edited and clear any validation errors
                    setOcrDataEdited(true)
                    setErrors(prev => ({ ...prev, ktm: '' }))
                    toast.success('OCR results updated successfully')
                    setShowOcrEditor(false)
                  }}
                  className="btn-pixel flex-1"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
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

export default RegistrationStep2