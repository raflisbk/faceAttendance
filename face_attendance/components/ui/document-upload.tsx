// components/ui/document-upload.tsx
'use client'

import React, { useState, useRef } from 'react'
import { Upload, File, CheckCircle, AlertCircle, X, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface DocumentFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'pdf'
  uploadProgress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  ocrData?: {
    extractedText: string
    confidence: number
    fields: Record<string, string>
  }
  error?: string
}

interface DocumentUploadProps {
  documentType: 'STUDENT_ID' | 'STAFF_ID' | 'PASSPORT' | 'DRIVING_LICENSE'
  onDocumentProcessed?: (data: { file: File; ocrData: any }) => void
  onDocumentRemoved?: (documentId: string) => void
  allowMultiple?: boolean
  maxFileSize?: number // in MB
  className?: string
}

export function DocumentUpload({
  documentType,
  onDocumentProcessed,
  onDocumentRemoved,
  allowMultiple = false,
  maxFileSize = 10,
  className
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'STUDENT_ID': return 'Student ID Card'
      case 'STAFF_ID': return 'Staff ID Card'
      case 'PASSPORT': return 'Passport'
      case 'DRIVING_LICENSE': return 'Driving License'
      default: return 'Document'
    }
  }

  const getAcceptedFormats = () => {
    return 'image/jpeg,image/png,image/webp,application/pdf'
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, WebP images and PDF files are allowed'
    }

    return null
  }

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        resolve('/api/placeholder/pdf-icon') // PDF icon placeholder
      } else {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      }
    })
  }

  const processDocument = async (document: DocumentFile) => {
    try {
      // Update status to processing
      setDocuments(prev => prev.map(doc =>
        doc.id === document.id
          ? { ...doc, status: 'processing' }
          : doc
      ))

      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock OCR results based on document type
      const mockOCRData: {
        extractedText: string
        confidence: number
        fields: Record<string, string>
      } = {
        extractedText: `Sample extracted text from ${getDocumentTypeLabel(documentType)}`,
        confidence: 0.92,
        fields: documentType === 'STUDENT_ID' ? {
          studentId: '2024001234',
          name: 'John Doe',
          faculty: 'Computer Science',
          validUntil: '2026-12-31'
        } : documentType === 'STAFF_ID' ? {
          staffId: 'STF2024001',
          name: 'Jane Smith',
          department: 'Information Technology',
          position: 'Lecturer'
        } : {
          documentNumber: 'ABC123456',
          name: 'John Doe',
          dateOfBirth: '1990-01-01'
        }
      }

      // Update document with OCR results
      setDocuments(prev => prev.map(doc =>
        doc.id === document.id
          ? {
              ...doc,
              status: 'completed',
              ocrData: mockOCRData,
              uploadProgress: 100
            }
          : doc
      ))

      // Call callback
      onDocumentProcessed?.({
        file: document.file,
        ocrData: mockOCRData
      })

    } catch (error) {
      setDocuments(prev => prev.map(doc =>
        doc.id === document.id
          ? {
              ...doc,
              status: 'error',
              error: 'Failed to process document. Please try again.'
            }
          : doc
      ))
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const error = validateFile(file)
      if (error) {
        alert(`${file.name}: ${error}`)
        return false
      }
      return true
    })

    if (!allowMultiple && validFiles.length > 1) {
      alert('Please select only one file')
      return
    }

    for (const file of validFiles) {
      const preview = await createPreview(file)
      const documentFile: DocumentFile = {
        id: Date.now().toString() + Math.random().toString(36),
        file,
        preview,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        uploadProgress: 0,
        status: 'uploading'
      }

      setDocuments(prev => allowMultiple ? [...prev, documentFile] : [documentFile])

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setDocuments(prev => prev.map(doc => {
          if (doc.id === documentFile.id && doc.uploadProgress < 100) {
            const newProgress = Math.min(doc.uploadProgress + 10, 100)
            if (newProgress === 100) {
              clearInterval(uploadInterval)
              setTimeout(() => processDocument(doc), 500)
            }
            return { ...doc, uploadProgress: newProgress }
          }
          return doc
        }))
      }, 200)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    onDocumentRemoved?.(documentId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <LoadingSpinner size="sm" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return 'Uploading...'
      case 'processing': return 'Processing with OCR...'
      case 'completed': return 'Processing complete'
      case 'error': return 'Processing failed'
      default: return ''
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload {getDocumentTypeLabel(documentType)}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-slate-400" />

            <div>
              <p className="text-lg font-medium">
                Drop your {getDocumentTypeLabel(documentType).toLowerCase()} here
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                or click to browse files
              </p>
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="chalkOutline"
            >
              Choose File
            </Button>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports: JPEG, PNG, WebP, PDF • Max size: {maxFileSize}MB
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedFormats()}
          multiple={allowMultiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Uploaded Documents</h3>

            {documents.map((document) => (
              <Card key={document.id} className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {document.type === 'image' ? (
                        <img
                          src={document.preview}
                          alt="Document preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg border flex items-center justify-center">
                          <File className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium truncate">{document.file.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {(document.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {document.status === 'completed' && (
                            <Button variant="chalkOutline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => removeDocument(document.id)}
                            variant="chalkOutline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {document.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${document.uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusIcon(document.status)}
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {getStatusText(document.status)}
                        </span>
                      </div>

                      {/* Error Message */}
                      {document.status === 'error' && document.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          {document.error}
                        </p>
                      )}

                      {/* OCR Results Preview */}
                      {document.status === 'completed' && document.ocrData && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                            Extracted Information (Confidence: {(document.ocrData.confidence * 100).toFixed(1)}%)
                          </p>
                          <div className="space-y-1">
                            {Object.entries(document.ocrData.fields).map(([key, value]) => (
                              <div key={key} className="flex text-sm">
                                <span className="font-medium text-green-600 dark:text-green-400 capitalize min-w-0 flex-shrink-0 mr-2">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-green-700 dark:text-green-300">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Guidelines */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
            Document Guidelines
          </h4>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Ensure the document is clear and well-lit</li>
            <li>• All text should be readable and not blurred</li>
            <li>• Document should be flat without folds or creases</li>
            <li>• Include all corners of the document in the image</li>
            <li>• Avoid shadows or glare on the document surface</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}