export interface WifiValidationResult {
  isValid: boolean
  confidence: number
  distance?: number
  message: string
}

export interface LocationCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface WifiNetwork {
  ssid: string
  bssid?: string
  rssi?: number
  frequency?: number
}

/**
 * Validate WiFi location for attendance
 */
export async function validateWifiLocation(
  detectedSSID: string,
  expectedSSID: string,
  coordinates?: LocationCoordinates
): Promise<WifiValidationResult> {
  try {
    // Check if SSID matches
    if (!detectedSSID) {
      return {
        isValid: false,
        confidence: 0,
        message: 'No WiFi network detected'
      }
    }

    if (detectedSSID !== expectedSSID) {
      return {
        isValid: false,
        confidence: 0,
        message: `Wrong WiFi network. Expected: ${expectedSSID}, Found: ${detectedSSID}`
      }
    }

    let confidence = 80 // Base confidence for correct SSID

    // If coordinates are provided, validate location
    if (coordinates) {
      const locationValidation = await validateLocationCoordinates(coordinates)
      confidence = Math.min(confidence + locationValidation.boost, 100)

      if (!locationValidation.isValid) {
        return {
          isValid: false,
          confidence: confidence * 0.5, // Reduce confidence if location is suspicious
          distance: locationValidation.distance,
          message: `Location validation failed: ${locationValidation.message}`
        }
      }
    }

    return {
      isValid: true,
      confidence,
      message: 'WiFi location validation successful'
    }

  } catch (error) {
    console.error('WiFi validation error:', error)
    return {
      isValid: false,
      confidence: 0,
      message: 'Error during WiFi validation'
    }
  }
}

/**
 * Validate location coordinates
 */
async function validateLocationCoordinates(
  coordinates: LocationCoordinates
): Promise<{ isValid: boolean; boost: number; distance?: number; message: string }> {
  try {
    // Check coordinate validity
    if (!isValidCoordinate(coordinates.latitude, coordinates.longitude)) {
      return {
        isValid: false,
        boost: 0,
        message: 'Invalid coordinates provided'
      }
    }

    // Check accuracy
    if (coordinates.accuracy && coordinates.accuracy > 100) {
      return {
        isValid: false,
        boost: 0,
        message: 'Location accuracy too low (>100m)'
      }
    }

    // For now, we'll implement a basic validation
    // In a real scenario, you'd compare against known classroom coordinates
    const boost = coordinates.accuracy && coordinates.accuracy < 20 ? 20 : 10

    return {
      isValid: true,
      boost,
      message: 'Location coordinates validated'
    }

  } catch (error) {
    console.error('Location validation error:', error)
    return {
      isValid: false,
      boost: 0,
      message: 'Error validating location coordinates'
    }
  }
}

/**
 * Check if coordinates are valid
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  )
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Validate WiFi network strength and properties
 */
export function validateWifiStrength(
  network: WifiNetwork,
  minRSSI: number = -70
): { isValid: boolean; strength: string; message: string } {
  if (!network.rssi) {
    return {
      isValid: true, // Allow if RSSI not available
      strength: 'unknown',
      message: 'Signal strength not available'
    }
  }

  const rssi = network.rssi

  if (rssi > -30) {
    return {
      isValid: true,
      strength: 'excellent',
      message: 'Excellent signal strength'
    }
  } else if (rssi > -50) {
    return {
      isValid: true,
      strength: 'good',
      message: 'Good signal strength'
    }
  } else if (rssi > -70) {
    return {
      isValid: true,
      strength: 'fair',
      message: 'Fair signal strength'
    }
  } else if (rssi > minRSSI) {
    return {
      isValid: true,
      strength: 'weak',
      message: 'Weak but acceptable signal strength'
    }
  } else {
    return {
      isValid: false,
      strength: 'poor',
      message: 'Signal strength too weak for reliable validation'
    }
  }
}

/**
 * Get WiFi networks (browser API wrapper)
 */
export async function getAvailableWifiNetworks(): Promise<WifiNetwork[]> {
  try {
    // This is a simplified implementation
    // In a real browser environment, you'd need permission and use the Network Information API
    // or a custom native app bridge

    // For web browsers, we can only get limited network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return [{
        ssid: 'Current Network',
        rssi: connection.downlink ? -30 : -70, // Rough estimation
      }]
    }

    return []
  } catch (error) {
    console.error('Error getting WiFi networks:', error)
    return []
  }
}

/**
 * Enhanced WiFi validation with multiple factors
 */
export async function enhancedWifiValidation(
  detectedNetwork: WifiNetwork,
  expectedNetwork: WifiNetwork,
  coordinates?: LocationCoordinates
): Promise<WifiValidationResult> {
  try {
    let confidence = 0
    const validationIssues: string[] = []

    // SSID validation (most important)
    if (detectedNetwork.ssid === expectedNetwork.ssid) {
      confidence += 60
    } else {
      return {
        isValid: false,
        confidence: 0,
        message: `SSID mismatch. Expected: ${expectedNetwork.ssid}, Found: ${detectedNetwork.ssid}`
      }
    }

    // BSSID validation (if available)
    if (expectedNetwork.bssid && detectedNetwork.bssid) {
      if (detectedNetwork.bssid === expectedNetwork.bssid) {
        confidence += 20
      } else {
        validationIssues.push('BSSID mismatch (different access point)')
        confidence -= 10
      }
    }

    // Signal strength validation
    const strengthValidation = validateWifiStrength(detectedNetwork)
    if (strengthValidation.isValid) {
      confidence += 10
    } else {
      validationIssues.push(strengthValidation.message)
      confidence -= 5
    }

    // Location validation
    if (coordinates) {
      const locationValidation = await validateLocationCoordinates(coordinates)
      if (locationValidation.isValid) {
        confidence += locationValidation.boost
      } else {
        validationIssues.push(locationValidation.message)
        confidence -= 10
      }
    }

    // Frequency validation (if available)
    if (expectedNetwork.frequency && detectedNetwork.frequency) {
      const frequencyDiff = Math.abs(detectedNetwork.frequency - expectedNetwork.frequency)
      if (frequencyDiff <= 5) { // 5 MHz tolerance
        confidence += 5
      } else {
        validationIssues.push('Frequency mismatch')
        confidence -= 5
      }
    }

    const isValid = confidence >= 70
    const message = isValid
      ? 'WiFi validation successful'
      : `WiFi validation failed: ${validationIssues.join(', ')}`

    return {
      isValid,
      confidence: Math.max(0, Math.min(100, confidence)),
      message
    }

  } catch (error) {
    console.error('Enhanced WiFi validation error:', error)
    return {
      isValid: false,
      confidence: 0,
      message: 'Error during enhanced WiFi validation'
    }
  }
}