// components/ui/network-configuration.tsx
'use client'

import React, { useState } from 'react'
import { Plus, Edit, Trash2, Wifi, Lock, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface NetworkConfig {
  id: string
  ssid: string
  bssid?: string
  security: 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3'
  password?: string
  locationId: string
  locationName: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface NetworkConfigurationProps {
  networks?: NetworkConfig[]
  locations?: Array<{ id: string; name: string }>
  onNetworkAdd?: (network: Partial<NetworkConfig>) => Promise<void>
  onNetworkUpdate?: (id: string, network: Partial<NetworkConfig>) => Promise<void>
  onNetworkDelete?: (id: string) => Promise<void>
  className?: string
}

export function NetworkConfiguration({
  networks = [],
  locations = [],
  onNetworkAdd,
  onNetworkUpdate,
  onNetworkDelete,
  className
}: NetworkConfigurationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<NetworkConfig | null>(null)
  const [formData, setFormData] = useState<{
    ssid: string
    bssid: string
    security: 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3'
    password: string
    locationId: string
    isActive: boolean
  }>({
    ssid: '',
    bssid: '',
    security: 'WPA2',
    password: '',
    locationId: '',
    isActive: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingNetwork) {
        await onNetworkUpdate?.(editingNetwork.id, formData)
      } else {
        await onNetworkAdd?.(formData)
      }

      setIsDialogOpen(false)
      setEditingNetwork(null)
      setFormData({
        ssid: '',
        bssid: '',
        security: 'WPA2',
        password: '',
        locationId: '',
        isActive: true
      })
    } catch (error) {
      console.error('Error saving network:', error)
    }
  }

  const handleEdit = (network: NetworkConfig) => {
    setEditingNetwork(network)
    setFormData({
      ssid: network.ssid,
      bssid: network.bssid || '',
      security: network.security,
      password: network.password || '',
      locationId: network.locationId,
      isActive: network.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this network configuration?')) {
      await onNetworkDelete?.(id)
    }
  }

  const getSecurityIcon = (security: string) => {
    return security === 'OPEN' ? <Wifi className="w-4 h-4" /> : <Lock className="w-4 h-4" />
  }

  const getSecurityColor = (security: string) => {
    switch (security) {
      case 'OPEN': return 'text-red-600 dark:text-red-400'
      case 'WEP': return 'text-orange-600 dark:text-orange-400'
      case 'WPA': return 'text-yellow-600 dark:text-yellow-400'
      case 'WPA2': return 'text-green-600 dark:text-green-400'
      case 'WPA3': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Network Configuration
          </CardTitle>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingNetwork(null)
                  setFormData({
                    ssid: '',
                    bssid: '',
                    security: 'WPA2',
                    password: '',
                    locationId: '',
                    isActive: true
                  })
                }}
                variant="chalk"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Network
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingNetwork ? 'Edit Network' : 'Add Network'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="ssid">Network Name (SSID)</Label>
                  <Input
                    id="ssid"
                    value={formData.ssid}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssid: e.target.value }))}
                    placeholder="Campus_WiFi_A101"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bssid">BSSID (Optional)</Label>
                  <Input
                    id="bssid"
                    value={formData.bssid}
                    onChange={(e) => setFormData(prev => ({ ...prev, bssid: e.target.value }))}
                    placeholder="00:11:22:33:44:55"
                  />
                </div>

                <div>
                  <Label htmlFor="security">Security Type</Label>
                  <Select
                    value={formData.security}
                    onValueChange={(value: 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3') =>
                      setFormData(prev => ({ ...prev, security: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open (No Security)</SelectItem>
                      <SelectItem value="WEP">WEP</SelectItem>
                      <SelectItem value="WPA">WPA</SelectItem>
                      <SelectItem value="WPA2">WPA2</SelectItem>
                      <SelectItem value="WPA3">WPA3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.security !== 'OPEN' && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Network password"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="chalkOutline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="chalk">
                    {editingNetwork ? 'Update' : 'Add'} Network
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {networks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Wifi className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No networks configured</p>
            <p className="text-sm">Add a network to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {networks.map((network) => {
              const location = locations.find(l => l.id === network.locationId)

              return (
                <div
                  key={network.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    "transition-colors duration-200",
                    network.isActive
                      ? "border-slate-200 dark:border-slate-700"
                      : "border-slate-200 dark:border-slate-700 opacity-50"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getSecurityIcon(network.security)}
                      <span className="font-medium">{network.ssid}</span>
                      <span className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        getSecurityColor(network.security),
                        "bg-slate-100 dark:bg-slate-800"
                      )}>
                        {network.security}
                      </span>
                      {!network.isActive && (
                        <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    {network.bssid && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        BSSID: {network.bssid}
                      </p>
                    )}

                    <div className="flex items-center gap-1 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span>{location?.name || 'Unknown Location'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEdit(network)}
                      variant="chalkOutline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(network.id)}
                      variant="chalkOutline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}