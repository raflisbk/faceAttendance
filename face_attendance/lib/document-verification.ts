/**
 * Document verification utilities for validating uploaded documents
 */

import { extractDocumentData, validateDocumentText, type DocumentData } from './ocr'

export interface DocumentVerificationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  extractedData: Record<string, any>
  verificationChecks: {
    formatCheck: boolean
    contentCheck: boolean
    qualityCheck: boolean
    consistencyCheck: boolean
  }
}

export interface DocumentValidationRules {
  requiredFields: string[]
  formatPatterns: Record<string, RegExp>
  minConfidence: number
  allowedFormats: string[]
  maxFileSize: number
}

/**
 * Document verification service
 */
export class DocumentVerificationService {
  private validationRules: Record<string, DocumentValidationRules> = {
    ID_CARD: {
      requiredFields: ['name', 'idNumber'],
      formatPatterns: {
        idNumber: /^[0-9]{10,16}$/,
        name: /^[a-zA-Z\s\-\'\.]{2,100}$/
      },
      minConfidence: 0.7,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    },
    STUDENT_CARD: {
      requiredFields: ['name', 'studentId'],
      formatPatterns: {
        studentId: /^[0-9]{6,15}$/,
        name: /^[a-zA-Z\s\-\'\.]{2,100}$/
      },
      minConfidence: 0.7,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024
    },
    TRANSCRIPT: {
      requiredFields: ['name'],
      formatPatterns: {
        name: /^[a-zA-Z\s\-\'\.]{2,100}$/,
        gpa: /^[0-4]\.[0-9]{1,2}$/
      },
      minConfidence: 0.6,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    },
    CERTIFICATE: {
      requiredFields: ['name'],
      formatPatterns: {
        name: /^[a-zA-Z\s\-\'\.]{2,100}$/
      },
      minConfidence: 0.6,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxFileSize: 10 * 1024 * 1024
    }
  }

  async verifyDocument(
    file: File | Buffer,
    documentType: string,
    expectedData?: Record<string, any>
  ): Promise<DocumentVerificationResult> {
    const rules = this.validationRules[documentType]
    if (!rules) {
      throw new Error(`Unsupported document type: ${documentType}`)
    }

    // Initialize result
    const result: DocumentVerificationResult = {
      isValid: false,
      confidence: 0,
      issues: [],
      extractedData: {},
      verificationChecks: {
        formatCheck: false,
        contentCheck: false,
        qualityCheck: false,
        consistencyCheck: false
      }
    }

    try {
      // 1. Format validation
      const formatCheckResult = await this.validateFormat(file, rules)
      result.verificationChecks.formatCheck = formatCheckResult.isValid
      if (!formatCheckResult.isValid) {
        result.issues.push(...formatCheckResult.issues)
      }

      // 2. Extract document data using OCR
      const documentData = await extractDocumentData(file, documentType)
      result.extractedData = documentData.structuredData
      result.confidence = documentData.confidence

      // 3. Content validation
      const contentCheckResult = await this.validateContent(documentData, rules)
      result.verificationChecks.contentCheck = contentCheckResult.isValid
      if (!contentCheckResult.isValid) {
        result.issues.push(...contentCheckResult.issues)
      }

      // 4. Quality check
      const qualityCheckResult = await this.validateQuality(documentData, rules)
      result.verificationChecks.qualityCheck = qualityCheckResult.isValid
      if (!qualityCheckResult.isValid) {
        result.issues.push(...qualityCheckResult.issues)
      }

      // 5. Consistency check (if expected data provided)
      if (expectedData) {
        const consistencyCheckResult = await this.validateConsistency(
          documentData.structuredData,
          expectedData
        )
        result.verificationChecks.consistencyCheck = consistencyCheckResult.isValid
        if (!consistencyCheckResult.isValid) {
          result.issues.push(...consistencyCheckResult.issues)
        }
      } else {
        result.verificationChecks.consistencyCheck = true
      }

      // 6. Overall validation
      result.isValid = Object.values(result.verificationChecks).every(check => check === true)

    } catch (error) {
      console.error('Document verification error:', error)
      result.issues.push('Failed to process document')
    }

    return result
  }

  private async validateFormat(
    file: File | Buffer,
    rules: DocumentValidationRules
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    if (file instanceof File) {
      // Check file type
      if (!rules.allowedFormats.includes(file.type)) {
        issues.push(`Invalid file format. Allowed formats: ${rules.allowedFormats.join(', ')}`)
      }

      // Check file size
      if (file.size > rules.maxFileSize) {
        const maxSizeMB = rules.maxFileSize / (1024 * 1024)
        issues.push(`File size too large. Maximum size: ${maxSizeMB}MB`)
      }

      // Check minimum file size (avoid empty files)
      if (file.size < 1024) { // 1KB minimum
        issues.push('File is too small or may be corrupted')
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  private async validateContent(
    documentData: DocumentData,
    rules: DocumentValidationRules
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    // Check required fields
    for (const field of rules.requiredFields) {
      if (!documentData.structuredData[field]) {
        issues.push(`Required field missing: ${field}`)
      }
    }

    // Validate field formats
    for (const [field, pattern] of Object.entries(rules.formatPatterns)) {
      const value = documentData.structuredData[field]
      if (value && !pattern.test(value)) {
        issues.push(`Invalid format for ${field}: ${value}`)
      }
    }

    // Validate using OCR text analysis
    const textValidation = await validateDocumentText(documentData.extractedText, documentData.type)
    if (!textValidation.isValid) {
      issues.push(...textValidation.issues)
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  private async validateQuality(
    documentData: DocumentData,
    rules: DocumentValidationRules
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    // Check OCR confidence
    if (documentData.confidence < rules.minConfidence) {
      issues.push(`Document quality too low (${Math.round(documentData.confidence * 100)}% confidence)`)
    }

    // Check text length (ensure sufficient content was extracted)
    if (documentData.extractedText.length < 50) {
      issues.push('Insufficient text extracted - document may be unclear or damaged')
    }

    // Check for common OCR errors that indicate poor quality
    const ocrErrorIndicators = [
      /[^\w\s\-\.,'":;()\/]/g, // Unusual characters
      /\s{5,}/g, // Multiple consecutive spaces
      /[A-Z]{20,}/g // Very long uppercase sequences
    ]

    const errorCount = ocrErrorIndicators.reduce((count, pattern) => {
      const matches = documentData.extractedText.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (errorCount > 10) {
      issues.push('Document may be blurry or contain artifacts')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  private async validateConsistency(
    extractedData: Record<string, any>,
    expectedData: Record<string, any>
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    // Compare key fields
    const fieldsToCompare = ['name', 'studentId', 'employeeId', 'idNumber']

    for (const field of fieldsToCompare) {
      if (expectedData[field] && extractedData[field]) {
        const expected = this.normalizeString(expectedData[field])
        const extracted = this.normalizeString(extractedData[field])

        // Check for exact match or high similarity
        if (expected !== extracted) {
          const similarity = this.calculateSimilarity(expected, extracted)
          if (similarity < 0.8) {
            issues.push(`${field} mismatch: expected "${expectedData[field]}", found "${extractedData[field]}"`)
          }
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  private normalizeString(str: string): string {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1

    const distance = this.levenshteinDistance(str1, str2)
    return (maxLength - distance) / maxLength
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1, // deletion
          matrix[j - 1]![i]! + 1, // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        )
      }
    }

    return matrix[str2.length]![str1.length]!
  }

  /**
   * Get validation rules for a document type
   */
  getValidationRules(documentType: string): DocumentValidationRules | null {
    return this.validationRules[documentType] || null
  }

  /**
   * Update validation rules for a document type
   */
  updateValidationRules(documentType: string, rules: Partial<DocumentValidationRules>): void {
    if (this.validationRules[documentType]) {
      this.validationRules[documentType] = {
        ...this.validationRules[documentType],
        ...rules
      }
    } else {
      throw new Error(`Unknown document type: ${documentType}`)
    }
  }

  /**
   * Batch verify multiple documents
   */
  async verifyDocuments(
    documents: Array<{ file: File | Buffer; type: string; expectedData?: Record<string, any> }>
  ): Promise<DocumentVerificationResult[]> {
    const results = await Promise.all(
      documents.map(doc => this.verifyDocument(doc.file, doc.type, doc.expectedData))
    )

    return results
  }
}

// Create service instance
const documentVerificationService = new DocumentVerificationService()

// Export convenience functions
export async function verifyDocument(
  file: File | Buffer,
  documentType: string,
  expectedData?: Record<string, any>
): Promise<DocumentVerificationResult> {
  return documentVerificationService.verifyDocument(file, documentType, expectedData)
}

export async function batchVerifyDocuments(
  documents: Array<{ file: File | Buffer; type: string; expectedData?: Record<string, any> }>
): Promise<DocumentVerificationResult[]> {
  return documentVerificationService.verifyDocuments(documents)
}

export function getDocumentValidationRules(documentType: string): DocumentValidationRules | null {
  return documentVerificationService.getValidationRules(documentType)
}

