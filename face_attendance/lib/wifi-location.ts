// face_attendance/lib/wifi-location.ts
interface WiFiNetwork {
  ssid: string
  bssid?: string
  signalStrength: number
  frequency?: number
  security?: string
}

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface AttendanceLocation {
  id: string
  name: string
  building: string
  wifiSSIDs: string[]
  coordinates?: {
    latitude: number
    longitude: number
    radius: number
  }
  isActive: boolean
}

export class WiFiLocationService {
  private static instance: WiFiLocationService
  private availableNetworks: WiFiNetwork[] = []
  private currentLocation: LocationData | null = null
  private locationWatcher: number | null = null

  private constructor() {}

  static getInstance(): WiFiLocationService {
    if (!WiFiLocationService.instance) {
      WiFiLocationService.instance = new WiFiLocationService()
    }
    return WiFiLocationService.instance
  }

  /**
   * Get current WiFi networks (mock implementation for browser)
   */
  async scanWiFiNetworks(): Promise<WiFiNetwork[]> {
    try {
      // Browser environment - use navigator.connection if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          // Mock WiFi scan result based on available info
          this.availableNetworks = [{
            ssid: 'DETECTED_NETWORK',
            signalStrength: this.getRandomSignalStrength(),
            frequency: 2400,
            security: 'WPA2'
          }]
        }
      }

      // For demo purposes, simulate detected networks
      this.availableNetworks = this.getMockWiFiNetworks()
      
      return this.availableNetworks
    } catch (error) {
      console.error('WiFi scan failed:', error)
      return []
    }
  }

  /**
   * Check if specific SSID is available
   */
  async checkSSIDAvailability(requiredSSID: string): Promise<{
    available: boolean
    signalStrength?: number
    network?: WiFiNetwork
  }> {
    const networks = await this.scanWiFiNetworks()
    const matchingNetwork = networks.find(network => 
      network.ssid.toLowerCase() === requiredSSID.toLowerCase()
    )

    return {
      available: !!matchingNetwork,
      signalStrength: matchingNetwork?.signalStrength,
      network: matchingNetwork
    }
  }

  /**
   * Validate location for attendance
   */
  async validateLocationForAttendance(
    requiredLocation: AttendanceLocation
  ): Promise<{
    valid: boolean
    reason?: string
    wifiMatch?: boolean
    gpsMatch?: boolean
    confidence: number
  }> {
    const validationResult = {
      valid: false,
      wifiMatch: false,
      gpsMatch: false,
      confidence: 0,
      reason: ''
    }

    try {
      // Check WiFi validation
      const wifiResults = await this.validateWiFiLocation(requiredLocation.wifiSSIDs)
      validationResult.wifiMatch = wifiResults.valid
      
      let confidence = wifiResults.confidence

      // Check GPS validation if coordinates available
      if (requiredLocation.coordinates) {
        const gpsResults = await this.validateGPSLocation(requiredLocation.coordinates)
        validationResult.gpsMatch = gpsResults.valid
        confidence = Math.max(confidence, gpsResults.confidence)
      }

      validationResult.confidence = confidence

      // Determine overall validity
      if (validationResult.wifiMatch || validationResult.gpsMatch) {
        validationResult.valid = true
      } else {
        validationResult.reason = 'Location validation failed. Please ensure you are in the correct classroom.'
      }

      return validationResult
    } catch (error) {
      console.error('Location validation failed:', error)
      return {
        ...validationResult,
        reason: 'Unable to verify location. Please try again.'
      }
    }
  }

  /**
   * Validate WiFi-based location
   */
  private async validateWiFiLocation(requiredSSIDs: string[]): Promise<{
    valid: boolean
    confidence: number
    detectedSSIDs: string[]
  }> {
    const networks = await this.scanWiFiNetworks()
    const detectedSSIDs = networks.map(n => n.ssid)
    
    const matchingSSIDs = requiredSSIDs.filter(required =>
      detectedSSIDs.some(detected => 
        detected.toLowerCase() === required.toLowerCase()
      )
    )

    const confidence = matchingSSIDs.length / requiredSSIDs.length

    return {
      valid: matchingSSIDs.length > 0,
      confidence,
      detectedSSIDs: matchingSSIDs
    }
  }

  /**
   * Get current GPS location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported')
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            }
            this.currentLocation = locationData
            resolve(locationData)
          },
          (error) => {
            console.error('GPS location failed:', error)
            reject(error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        )
      })
    } catch (error) {
      console.error('Failed to get location:', error)
      return null
    }
  }

  /**
   * Validate GPS-based location
   */
  private async validateGPSLocation(requiredLocation: {
    latitude: number
    longitude: number
    radius: number
  }): Promise<{
    valid: boolean
    confidence: number
    distance?: number
  }> {
    try {
      const currentLocation = await this.getCurrentLocation()
      
      if (!currentLocation) {
        return { valid: false, confidence: 0 }
      }

      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        requiredLocation.latitude,
        requiredLocation.longitude
      )

      const valid = distance <= requiredLocation.radius
      const confidence = valid ? Math.max(0, 1 - (distance / requiredLocation.radius)) : 0

      return { valid, confidence, distance }
    } catch (error) {
      console.error('GPS validation failed:', error)
      return { valid: false, confidence: 0 }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
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
   * Start watching location changes
   */
  startLocationWatching(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation) return

    this.locationWatcher = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }
        this.currentLocation = locationData
        callback(locationData)
      },
      (error) => {
        console.error('Location watching failed:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    )
  }

  /**
   * Stop watching location changes
   */
  stopLocationWatching(): void {
    if (this.locationWatcher !== null) {
      navigator.geolocation.clearWatch(this.locationWatcher)
      this.locationWatcher = null
    }
  }

  /**
   * Get signal strength category
   */
  getSignalStrengthCategory(signalStrength: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (signalStrength >= -50) return 'excellent'
    if (signalStrength >= -60) return 'good'
    if (signalStrength >= -70) return 'fair'
    return 'poor'
  }

  /**
   * Mock WiFi networks for demo
   */
  private getMockWiFiNetworks(): WiFiNetwork[] {
    const mockNetworks = [
      'CAMPUS_WIFI',
      'BUILDING_A_FLOOR_1',
      'CLASSROOM_101',
      'LECTURE_HALL_A',
      'LIBRARY_WIFI',
      'STUDENT_CENTER'
    ]

    return mockNetworks.map(ssid => ({
      ssid,
      signalStrength: this.getRandomSignalStrength(),
      frequency: Math.random() > 0.5 ? 2400 : 5000,
      security: 'WPA2'
    }))
  }

  /**
   * Generate random signal strength
   */
  private getRandomSignalStrength(): number {
    return Math.floor(Math.random() * 40) - 80 // -80 to -40 dBm
  }

  /**
   * Check if location services are available
   */
  isLocationAvailable(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Check if WiFi scanning is supported (mock for browser)
   */
  isWiFiScanningSupported(): boolean {
    // In browser environment, we simulate WiFi scanning
    return true
  }

  /**
   * Get current location accuracy
   */
  getCurrentLocationAccuracy(): number {
    return this.currentLocation?.accuracy || 0
  }

  /**
   * Validate multiple locations simultaneously
   */
  async validateMultipleLocations(
    locations: AttendanceLocation[]
  ): Promise<{
    bestMatch: AttendanceLocation | null
    validLocations: AttendanceLocation[]
    confidence: number
  }> {
    const validationResults = await Promise.all(
      locations.map(async (location) => ({
        location,
        result: await this.validateLocationForAttendance(location)
      }))
    )

    const validLocations = validationResults
      .filter(({ result }) => result.valid)
      .map(({ location }) => location)

    const bestMatch = validationResults
      .sort((a, b) => b.result.confidence - a.result.confidence)[0]?.location || null

    const maxConfidence = Math.max(
      ...validationResults.map(({ result }) => result.confidence),
      0
    )

    return {
      bestMatch,
      validLocations,
      confidence: maxConfidence
    }
  }
}