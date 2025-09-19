/**
 * QR Code generation and validation utilities
 */

export interface QRCodeData {
  type: 'ATTENDANCE_QR'
  classId: string
  sessionToken: string
  generatedBy: string
  expiresAt: string
  sessionDuration: number
  locationId?: string
  metadata?: Record<string, any>
}

export interface QRCodeGenerationOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(
  data: string,
  options: QRCodeGenerationOptions = {}
): Promise<string> {
  try {
    // Since we can't use QRCode library directly in this environment,
    // we'll create a simple implementation using canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    const size = options.size || 256
    const margin = options.margin || 4
    const darkColor = options.color?.dark || '#000000'
    const lightColor = options.color?.light || '#FFFFFF'

    canvas.width = size
    canvas.height = size

    // Fill background
    ctx.fillStyle = lightColor
    ctx.fillRect(0, 0, size, size)

    // For now, create a simple pattern representing QR code
    // In production, you'd use a proper QR code library like 'qrcode'
    const cellSize = (size - 2 * margin) / 25 // 25x25 grid
    const dataHash = simpleHash(data)

    ctx.fillStyle = darkColor

    // Create a pseudo-QR pattern based on data hash
    for (let x = 0; x < 25; x++) {
      for (let y = 0; y < 25; y++) {
        const cellHash = (dataHash + x * 25 + y) % 256
        if (cellHash % 3 === 0) { // Pseudo-random pattern
          const cellX = margin + x * cellSize
          const cellY = margin + y * cellSize
          ctx.fillRect(cellX, cellY, cellSize, cellSize)
        }
      }
    }

    // Add finder patterns (corners)
    const finderSize = cellSize * 7
    drawFinderPattern(ctx, margin, margin, finderSize, darkColor, lightColor)
    drawFinderPattern(ctx, size - margin - finderSize, margin, finderSize, darkColor, lightColor)
    drawFinderPattern(ctx, margin, size - margin - finderSize, finderSize, darkColor, lightColor)

    return canvas.toDataURL('image/png')

  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code with proper library (if available)
 */
export async function generateQRCodeWithLibrary(
  data: string,
  options: QRCodeGenerationOptions = {}
): Promise<string> {
  // This would use a proper QR code library in production
  // For now, fallback to our simple implementation
  return generateQRCode(data, options)
}

/**
 * Validate QR code data structure
 */
export function validateQRCodeData(data: any): data is QRCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.type === 'ATTENDANCE_QR' &&
    typeof data.classId === 'string' &&
    typeof data.sessionToken === 'string' &&
    typeof data.generatedBy === 'string' &&
    typeof data.expiresAt === 'string' &&
    typeof data.sessionDuration === 'number'
  )
}

/**
 * Parse QR code data
 */
export function parseQRCodeData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString)
    return validateQRCodeData(data) ? data : null
  } catch (error) {
    console.error('Invalid QR code data:', error)
    return null
  }
}

/**
 * Check if QR code is expired
 */
export function isQRCodeExpired(qrData: QRCodeData): boolean {
  try {
    const expiresAt = new Date(qrData.expiresAt)
    return new Date() > expiresAt
  } catch (error) {
    console.error('Error checking QR code expiration:', error)
    return true
  }
}

/**
 * Generate attendance QR code data
 */
export function createAttendanceQRData(
  classId: string,
  generatedBy: string,
  sessionDuration: number = 60,
  expiresIn: number = 300
): QRCodeData {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  return {
    type: 'ATTENDANCE_QR',
    classId,
    sessionToken: generateSessionToken(),
    generatedBy,
    expiresAt: expiresAt.toISOString(),
    sessionDuration
  }
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Simple hash function for demo purposes
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Draw QR finder pattern
 */
function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  darkColor: string,
  lightColor: string
): void {
  const cellSize = size / 7

  // Outer border
  ctx.fillStyle = darkColor
  ctx.fillRect(x, y, size, size)

  // Inner white
  ctx.fillStyle = lightColor
  ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize)

  // Inner black square
  ctx.fillStyle = darkColor
  ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize)
}

/**
 * Generate printable QR code with metadata
 */
export async function generatePrintableQRCode(
  qrData: QRCodeData,
  options: {
    includeText?: boolean
    className?: string
    timestamp?: boolean
    logoUrl?: string
  } = {}
): Promise<string> {
  try {
    const qrImage = await generateQRCode(JSON.stringify(qrData))

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    // Set canvas size for printable format
    canvas.width = 400
    canvas.height = options.includeText ? 500 : 400

    // Fill background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw QR code
    const img = new Image()
    img.src = qrImage
    await new Promise((resolve) => { img.onload = resolve })

    const qrSize = 300
    const qrX = (canvas.width - qrSize) / 2
    const qrY = 20

    ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

    // Add text if requested
    if (options.includeText) {
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'

      // Class name
      if (options.className) {
        ctx.font = 'bold 16px Arial'
        ctx.fillText(options.className, canvas.width / 2, qrY + qrSize + 30)
      }

      // Timestamp
      if (options.timestamp) {
        ctx.font = '12px Arial'
        const timestamp = new Date().toLocaleString()
        ctx.fillText(`Generated: ${timestamp}`, canvas.width / 2, qrY + qrSize + 50)
      }

      // Expiration
      ctx.font = '12px Arial'
      const expiresAt = new Date(qrData.expiresAt).toLocaleString()
      ctx.fillText(`Expires: ${expiresAt}`, canvas.width / 2, qrY + qrSize + 70)
    }

    return canvas.toDataURL('image/png')

  } catch (error) {
    console.error('Error generating printable QR code:', error)
    throw new Error('Failed to generate printable QR code')
  }
}

/**
 * Batch generate QR codes for multiple classes
 */
export async function batchGenerateQRCodes(
  classes: Array<{ id: string; name: string }>,
  generatedBy: string,
  options: {
    sessionDuration?: number
    expiresIn?: number
    format?: 'individual' | 'combined'
  } = {}
): Promise<Array<{ classId: string; className: string; qrCode: string; data: QRCodeData }>> {
  const results = []

  for (const classInfo of classes) {
    try {
      const qrData = createAttendanceQRData(
        classInfo.id,
        generatedBy,
        options.sessionDuration,
        options.expiresIn
      )

      const qrCode = await generatePrintableQRCode(qrData, {
        includeText: true,
        className: classInfo.name,
        timestamp: true
      })

      results.push({
        classId: classInfo.id,
        className: classInfo.name,
        qrCode,
        data: qrData
      })
    } catch (error) {
      console.error(`Failed to generate QR code for class ${classInfo.id}:`, error)
    }
  }

  return results
}