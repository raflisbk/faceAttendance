// app/api/attendance/wifi-validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { validateWifiLocation } from '@/lib/wifi-validation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { classId, wifiSSID, coordinates } = await request.json()

    if (!classId || !wifiSSID) {
      return NextResponse.json(
        { error: 'Class ID and WiFi SSID are required' },
        { status: 400 }
      )
    }

    // Get class location information
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        location: true
      }
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Validate WiFi location
    const validationResult = await validateWifiLocation(
      wifiSSID,
      classData.location.wifiSsid,
      coordinates
    )

    return NextResponse.json({
      success: true,
      data: {
        isValid: validationResult.isValid,
        confidence: validationResult.confidence,
        distance: validationResult.distance,
        locationName: classData.location.name,
        expectedSSID: classData.location.wifiSsid,
        detectedSSID: wifiSSID,
        validationMethod: 'WIFI_LOCATION',
        timestamp: new Date().toISOString()
      },
      message: validationResult.isValid 
        ? 'Location validated successfully' 
        : 'Location validation failed'
    })

  } catch (error) {
    console.error('WiFi validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}