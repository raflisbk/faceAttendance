// components/ui/wifi-detector.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, MapPin, Signal, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface WiFiNetwork {
  ssid: string
  bssid: string
  signal: number
  frequency: number
  security: string[]
  isValidForAttendance: boolean
  locationId?: string
  locationName?: string
}

interface WiFiDetectorProps {
  onNetworkSelect?: (network: WiFiNetwork) => void
  onValidationResult?: (isValid: boolean, network?: WiFiNetwork) => void
  validateForAttendance?: boolean
  className?: string
}

export function WiFiDetector({ 
  onNetworkSelect, 
  onValidationResult,
  validateForAttendance = false,
  className 
}: WiFiDetectorProps) {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  const scanNetworks = async () => {
    setIsScanning(true)
    setError(null)

    try {
      // Simulate WiFi scanning - In real implementation, this would use
      // navigator.wifi API or backend service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockNetworks: WiFiNetwork[] = [
        {
          ssid: 'Campus_WiFi_A101',
          bssid: '00:11:22:33:44:55',
          signal: -45,
          frequency: 2412,
          security: ['WPA2'],
          isValidForAttendance: true,
          locationId: 'loc-1',
          locationName: 'Ruang A101'
        },
        {
          ssid: 'Campus_WiFi_B202',
          bssid: '00:11:22:33:44:56',
          signal: -65,
          frequency: 5180,
          security: ['WPA2', 'WPA3'],
          isValidForAttendance: true,
          locationId: 'loc-2',
          locationName: 'Ruang B202'
        },
        {
          ssid: 'Public_WiFi',
          bssid: '00:11:22:33:44:57',
          signal: -55,
          frequency: 2437,
          security: [],
          isValidForAttendance: false
        }
      ]

      // Filter networks for attendance validation if needed
      const filteredNetworks = validateForAttendance 
        ? mockNetworks.filter(n => n.isValidForAttendance)
        : mockNetworks

      setNetworks(filteredNetworks)
      setLastScan(new Date())
      
      // Auto-select first valid network for attendance
      if (validateForAttendance && filteredNetworks.length > 0) {
        const validNetwork = filteredNetworks[0]
        if (validNetwork) {
          setSelectedNetwork(validNetwork)
          onValidationResult?.(true, validNetwork)
          onNetworkSelect?.(validNetwork)
        }
      }

    } catch (err) {
      setError('Failed to scan WiFi networks. Please check your permissions.')
      onValidationResult?.(false)
    } finally {
      setIsScanning(false)
    }
  }

  const handleNetworkSelect = (network: WiFiNetwork) => {
    setSelectedNetwork(network)
    onNetworkSelect?.(network)
    
    if (validateForAttendance) {
      onValidationResult?.(network.isValidForAttendance, network)
    }
  }

  const getSignalStrength = (signal: number) => {
    if (signal > -30) return { level: 'excellent', bars: 4 }
    if (signal > -50) return { level: 'good', bars: 3 }
    if (signal > -70) return { level: 'fair', bars: 2 }
    return { level: 'poor', bars: 1 }
  }

  const getSignalColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 dark:text-green-400'
      case 'good': return 'text-blue-600 dark:text-blue-400'
      case 'fair': return 'text-yellow-600 dark:text-yellow-400'
      case 'poor': return 'text-red-600 dark:text-red-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  useEffect(() => {
    // Auto-scan on component mount
    scanNetworks()
  }, [])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            WiFi Networks
          </CardTitle>
          
          <Button
            onClick={scanNetworks}
            disabled={isScanning}
            variant="chalkOutline"
            size="sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isScanning && "animate-spin")} />
            {isScanning ? 'Scanning...' : 'Refresh'}
          </Button>
        </div>
        
        {lastScan && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Last scan: {lastScan.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isScanning && networks.length === 0 && (
          <LoadingSpinner text="Scanning for WiFi networks..." className="py-8" />
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <WifiOff className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {networks.length === 0 && !isScanning && !error && (
          <div className="flex flex-col items-center gap-4 py-8 text-slate-500 dark:text-slate-400">
            <WifiOff className="w-12 h-12" />
            <div className="text-center">
              <p className="font-medium">No WiFi networks found</p>
              <p className="text-sm">Try scanning again or check your location</p>
            </div>
          </div>
        )}

        {networks.length > 0 && (
          <div className="space-y-2">
            {networks.map((network) => {
              const signal = getSignalStrength(network.signal)
              const isSelected = selectedNetwork?.bssid === network.bssid
              
              return (
                <button
                  key={network.bssid}
                  onClick={() => handleNetworkSelect(network)}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all duration-200",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-slate-200 dark:border-slate-700",
                    !network.isValidForAttendance && validateForAttendance && 
                      "opacity-50 cursor-not-allowed"
                  )}
                  disabled={validateForAttendance && !network.isValidForAttendance}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{network.ssid}</span>
                        {network.security.length > 0 && (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                        {network.isValidForAttendance && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full">
                            <MapPin className="w-3 h-3" />
                            Valid for attendance
                          </span>
                        )}
                      </div>
                      
                      {network.locationName && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Location: {network.locationName}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>{network.frequency} MHz</span>
                        {network.security.length > 0 && (
                          <span>{network.security.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Signal className={cn("w-5 h-5", getSignalColor(signal.level))} />
                      <span className={cn("text-sm font-medium", getSignalColor(signal.level))}>
                        {network.signal} dBm
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {validateForAttendance && selectedNetwork && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Wifi className="w-5 h-5" />
              <span className="font-medium">Network validated for attendance</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Connected to {selectedNetwork.ssid} - {selectedNetwork.locationName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

