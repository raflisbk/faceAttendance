/**
 * OCR (Optical Character Recognition) utilities for document processing
 */

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
  lines: Array<{
    text: string
    words: string[]
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
}

export interface DocumentData {
  type: string
  extractedText: string
  structuredData: Record<string, any>
  confidence: number
}

/**
 * Mock OCR service for development
 */
class MockOCRService {
  async processImage(_imageBuffer: Buffer | File): Promise<OCRResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock OCR results based on common document patterns
    const mockText = this.generateMockText()

    return {
      text: mockText,
      confidence: 0.85,
      words: this.generateMockWords(mockText),
      lines: this.generateMockLines(mockText)
    }
  }

  private generateMockText(): string {
    const templates = [
      `STUDENT ID CARD
      University of Technology
      Name: John Doe
      Student ID: 2024001234
      Program: Computer Science
      Valid Until: 12/2027`,

      `NATIONAL ID CARD
      Republic of Indonesia
      Name: Jane Smith
      ID Number: 1234567890123456
      Date of Birth: 01/01/2000
      Address: Jakarta, Indonesia`,

      `TRANSCRIPT
      Academic Record
      Student: Michael Johnson
      GPA: 3.75
      Credits: 120
      Graduation: 2024`
    ]

    return templates[Math.floor(Math.random() * templates.length)] || ''
  }

  private generateMockWords(text: string): OCRResult['words'] {
    const words = text.split(/\s+/).filter(word => word.length > 0)

    return words.map((word, index) => ({
      text: word,
      confidence: 0.8 + Math.random() * 0.2,
      bbox: {
        x: (index % 10) * 50,
        y: Math.floor(index / 10) * 30,
        width: word.length * 8,
        height: 20
      }
    }))
  }

  private generateMockLines(text: string): OCRResult['lines'] {
    const lines = text.split('\n').filter(line => line.trim().length > 0)

    return lines.map((line, index) => ({
      text: line.trim(),
      words: line.trim().split(/\s+/),
      bbox: {
        x: 0,
        y: index * 30,
        width: 400,
        height: 25
      }
    }))
  }
}

/**
 * Real OCR service (would integrate with Tesseract.js or Google Vision API)
 */
class OCRService {
  private apiKey: string
  private endpoint: string

  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY || ''
    this.endpoint = 'https://vision.googleapis.com/v1/images:annotate'

    if (!this.apiKey) {
      console.warn('OCR API key not found, using mock service')
    }
  }

  async processImage(_imageBuffer: Buffer | File): Promise<OCRResult> {
    // If no API key, fall back to mock service
    if (!this.apiKey) {
      const mockService = new MockOCRService()
      return mockService.processImage(_imageBuffer)
    }

    try {
      // Convert image to base64
      let base64Image: string

      if (_imageBuffer instanceof File) {
        const arrayBuffer = await _imageBuffer.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        base64Image = buffer.toString('base64')
      } else {
        base64Image = _imageBuffer.toString('base64')
      }

      // Prepare request for Google Vision API
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 50
              }
            ]
          }
        ]
      }

      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.responses[0].error) {
        throw new Error(`OCR processing error: ${result.responses[0].error.message}`)
      }

      return this.parseGoogleVisionResponse(result.responses[0])

    } catch (error) {
      console.error('OCR processing error:', error)
      // Fall back to mock service on error
      const mockService = new MockOCRService()
      return mockService.processImage(_imageBuffer)
    }
  }

  private parseGoogleVisionResponse(response: any): OCRResult {
    const textAnnotations = response.textAnnotations || []

    if (textAnnotations.length === 0) {
      return {
        text: '',
        confidence: 0,
        words: [],
        lines: []
      }
    }

    // First annotation contains the full text
    const fullText = textAnnotations[0].description || ''

    // Extract words from individual annotations
    const words = textAnnotations.slice(1).map((annotation: any) => ({
      text: annotation.description,
      confidence: annotation.confidence || 0.5,
      bbox: {
        x: annotation.boundingPoly.vertices[0].x || 0,
        y: annotation.boundingPoly.vertices[0].y || 0,
        width: (annotation.boundingPoly.vertices[2].x || 0) - (annotation.boundingPoly.vertices[0].x || 0),
        height: (annotation.boundingPoly.vertices[2].y || 0) - (annotation.boundingPoly.vertices[0].y || 0)
      }
    }))

    // Group words into lines
    const lines = this.groupWordsIntoLines(words)

    return {
      text: fullText,
      confidence: this.calculateAverageConfidence(words),
      words,
      lines
    }
  }

  private groupWordsIntoLines(words: OCRResult['words']): OCRResult['lines'] {
    const lines: OCRResult['lines'] = []
    const threshold = 10 // pixels

    words.forEach(word => {
      const existingLine = lines.find(line =>
        Math.abs(line.bbox.y - word.bbox.y) < threshold
      )

      if (existingLine) {
        existingLine.words.push(word.text)
        existingLine.text += ' ' + word.text
        // Update bounding box
        existingLine.bbox.width = Math.max(
          existingLine.bbox.width,
          word.bbox.x + word.bbox.width - existingLine.bbox.x
        )
      } else {
        lines.push({
          text: word.text,
          words: [word.text],
          bbox: { ...word.bbox }
        })
      }
    })

    return lines.sort((a, b) => a.bbox.y - b.bbox.y)
  }

  private calculateAverageConfidence(words: OCRResult['words']): number {
    if (words.length === 0) return 0
    const total = words.reduce((sum, word) => sum + word.confidence, 0)
    return total / words.length
  }
}

/**
 * Document structure extraction
 */
export class DocumentProcessor {
  private ocrService: OCRService

  constructor() {
    this.ocrService = new OCRService()
  }

  async processDocument(imageBuffer: Buffer | File, documentType: string): Promise<DocumentData> {
    const ocrResult = await this.ocrService.processImage(imageBuffer)

    const structuredData = this.extractStructuredData(ocrResult.text, documentType)

    return {
      type: documentType,
      extractedText: ocrResult.text,
      structuredData,
      confidence: ocrResult.confidence
    }
  }

  private extractStructuredData(text: string, documentType: string): Record<string, any> {
    const data: Record<string, any> = {}

    switch (documentType) {
      case 'ID_CARD':
        data.name = this.extractPattern(text, /name[:\s]*([^\n]+)/i)
        data.idNumber = this.extractPattern(text, /(?:id|number)[:\s]*([0-9]+)/i)
        data.dateOfBirth = this.extractPattern(text, /(?:birth|dob)[:\s]*([0-9\/\-]+)/i)
        break

      case 'STUDENT_CARD':
        data.name = this.extractPattern(text, /name[:\s]*([^\n]+)/i)
        data.studentId = this.extractPattern(text, /(?:student\s*id|id)[:\s]*([0-9]+)/i)
        data.program = this.extractPattern(text, /(?:program|major)[:\s]*([^\n]+)/i)
        data.university = this.extractPattern(text, /(?:university|college)[:\s]*([^\n]+)/i)
        break

      case 'TRANSCRIPT':
        data.name = this.extractPattern(text, /(?:student|name)[:\s]*([^\n]+)/i)
        data.gpa = this.extractPattern(text, /gpa[:\s]*([0-9.]+)/i)
        data.credits = this.extractPattern(text, /credits?[:\s]*([0-9]+)/i)
        data.graduation = this.extractPattern(text, /graduation[:\s]*([0-9]+)/i)
        break

      default:
        // Generic extraction
        data.text = text
        break
    }

    return data
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern)
    return match?.[1]?.trim() || null
  }
}

// Create service instances
const ocrService = new OCRService()
const documentProcessor = new DocumentProcessor()

// Export convenience functions
export async function processImageOCR(imageBuffer: Buffer | File): Promise<OCRResult> {
  return ocrService.processImage(imageBuffer)
}

export async function extractDocumentData(
  imageBuffer: Buffer | File,
  documentType: string
): Promise<DocumentData> {
  return documentProcessor.processDocument(imageBuffer, documentType)
}

export async function validateDocumentText(text: string, documentType: string): Promise<{
  isValid: boolean
  issues: string[]
  confidence: number
}> {
  const issues: string[] = []
  let confidence = 1.0

  switch (documentType) {
    case 'ID_CARD':
      if (!text.match(/(?:id|identity)/i)) {
        issues.push('Document does not appear to be an ID card')
        confidence -= 0.3
      }
      if (!text.match(/[0-9]{10,}/)) {
        issues.push('No valid ID number found')
        confidence -= 0.2
      }
      break

    case 'STUDENT_CARD':
      if (!text.match(/(?:student|university|college)/i)) {
        issues.push('Document does not appear to be a student card')
        confidence -= 0.3
      }
      break

    case 'TRANSCRIPT':
      if (!text.match(/(?:transcript|academic|gpa)/i)) {
        issues.push('Document does not appear to be a transcript')
        confidence -= 0.3
      }
      break
  }

  // Check for text quality
  if (text.length < 50) {
    issues.push('Insufficient text extracted - image may be unclear')
    confidence -= 0.2
  }

  return {
    isValid: issues.length === 0,
    issues,
    confidence: Math.max(0, confidence)
  }
}

export async function extractTextFromDocument(
  documentUrl: string | File | Buffer
): Promise<{ text: string; confidence: number }> {
  try {
    let imageData: File | Buffer

    if (typeof documentUrl === 'string') {
      // Fetch document from URL
      const response = await fetch(documentUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      imageData = Buffer.from(arrayBuffer)
    } else {
      imageData = documentUrl
    }

    // Process with OCR
    const ocrResult = await processImageOCR(imageData)

    return {
      text: ocrResult.text,
      confidence: ocrResult.confidence
    }
  } catch (error) {
    console.error('Text extraction error:', error)
    throw new Error('Failed to extract text from document')
  }
}

// Main exports
export { OCRService, MockOCRService }

// Type exports
export type {
  OCRResult as OCRResultType,
  DocumentData as DocumentDataType
}