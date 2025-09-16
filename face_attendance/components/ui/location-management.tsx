// components/ui/location-management.tsx
'use client'

import React, { useState } from 'react'
import { MapPin, Plus, Edit, Trash2, Wifi, Users, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface Location {
  id: string
  name: string
  building: string
  floor: string
  room: string
  address: string
  wifiSSID: string
  wifiSecurity: string
  gpsCoordinates: {
    latitude: number
    longitude: number
  }
  capacity: number
  isActive: boolean
  additionalInfo?: {
    equipment?: string[]
    features?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

interface LocationManagementProps {
  locations?: Location[]
  onLocationAdd?: (location: Partial<Location>) => Promise<void>
  onLocationUpdate?: (id: string, location: Partial<Location>) => Promise<void>
  onLocationDelete?: (id: string) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function LocationManagement({
  locations = [],
  onLocationAdd,
  onLocationUpdate,
  onLocationDelete,
  isLoading = false,
  className
}: LocationManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: '',
    room: '',
    address: '',
    wifiSSID: '',
    wifiSecurity: 'WPA2',
    latitude: 0,
    longitude: 0,
    capacity: 30,
    isActive: true,
    equipment: '',
    features: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const locationData = {
      name: formData.name,
      building: formData.building,
      floor: formData.floor,
      room: formData.room,
      address: formData.address,
      wifiSSID: formData.wifiSSID,
      wifiSecurity: formData.wifiSecurity,
      gpsCoordinates: {
        latitude: formData.latitude,
        longitude: formData.longitude
      },
      capacity: formData.capacity,
      isActive: formData.isActive,
      additionalInfo: {
        equipment: formData.equipment.split(',').map(item => item.trim()).filter(Boolean),
        features: formData.features.split(',').map(item => item.trim()).filter(Boolean)
      }
    }

    try {
      if (editingLocation) {
        await onLocationUpdate?.(editingLocation.id, locationData)
      } else {
        await onLocationAdd?.(locationData)
      }
      
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving location:', error)
    }
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      building: location.building,
      floor: location.floor,
      room: location.room,
      address: location.address,
      wifiSSID: location.wifiSSID,
      wifiSecurity: location.wifiSecurity,
      latitude: location.gpsCoordinates.latitude,
      longitude: location.gpsCoordinates.longitude,
      capacity: location.capacity,
      isActive: location.isActive,
      equipment: location.additionalInfo?.equipment?.join(', ') || '',
      features: location.additionalInfo?.features?.join(', ') || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      await onLocationDelete?.(id)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingLocation(null)
    setFormData({
      name: '',
      building: '',
      floor: '',
      room: '',
      address: '',
      wifiSSID: '',
      wifiSecurity: 'WPA2',
      latitude: 0,
      longitude: 0,
      capacity: 30,
      isActive: true,
      equipment: '',
      features: ''
    })
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading locations..." className="py-12" />
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Management
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingLocation(null)
                  setFormData({
                    name: '',
                    building: '',
                    floor: '',
                    room: '',
                    address: '',
                    wifiSSID: '',
                    wifiSecurity: 'WPA2',
                    latitude: 0,
                    longitude: 0,
                    capacity: 30,
                    isActive: true,
                    equipment: '',
                    features: ''
                  })
                }}
                variant="chalk"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Location Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ruang Kuliah A101"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="building">Building</Label>
                      <Input
                        id="building"
                        value={formData.building}
                        onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                        placeholder="Gedung A"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        value={formData.floor}
                        onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                        placeholder="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="room">Room</Label>
                      <Input
                        id="room"
                        value={formData.room}
                        onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                        placeholder="101"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                        placeholder="30"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Full Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Jl. Sudirman No. 1, Jakarta"
                      required
                    />
                  </div>
                </div>

                {/* WiFi Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">WiFi Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wifiSSID">WiFi SSID</Label>
                      <Input
                        id="wifiSSID"
                        value={formData.wifiSSID}
                        onChange={(e) => setFormData(prev => ({ ...prev, wifiSSID: e.target.value }))}
                        placeholder="Campus_WiFi_A101"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="wifiSecurity">Security Type</Label>
                      <select
                        id="wifiSecurity"
                        value={formData.wifiSecurity}
                        onChange={(e) => setFormData(prev => ({ ...prev, wifiSecurity: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                      >
                        <option value="WPA3">WPA3</option>
                        <option value="WPA2">WPA2</option>
                        <option value="WPA">WPA</option>
                        <option value="OPEN">Open</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">GPS Coordinates</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                        placeholder="-6.200000"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                        placeholder="106.816666"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  
                  <div>
                    <Label htmlFor="equipment">Equipment (comma-separated)</Label>
                    <Input
                      id="equipment"
                      value={formData.equipment}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                      placeholder="Projector, Whiteboard, AC, Sound System"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="features">Features (comma-separated)</Label>
                    <Input
                      id="features"
                      value={formData.features}
                      onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                      placeholder="WiFi, Power Outlets, Natural Light"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active Location</Label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="chalkOutline"
                    onClick={handleCloseDialog}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="chalk">
                    {editingLocation ? 'Update' : 'Create'} Location
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Building className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No locations configured</p>
            <p className="text-sm mb-6">Create your first location to get started</p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              variant="chalk"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Location
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <Card 
                key={location.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  !location.isActive && "opacity-60"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{location.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {location.building} - Floor {location.floor}, Room {location.room}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleEdit(location)}
                        variant="chalkOutline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(location.id)}
                        variant="chalkOutline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {location.address}
                      </span>
                    </div>
                    
                    {/* WiFi Info */}
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {location.wifiSSID} ({location.wifiSecurity})
                      </span>
                    </div>
                    
                    {/* Capacity */}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Capacity: {location.capacity} people
                      </span>
                    </div>
                    
                    {/* GPS Coordinates */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      GPS: {location.gpsCoordinates.latitude.toFixed(6)}, {location.gpsCoordinates.longitude.toFixed(6)}
                    </div>
                    
                    {/* Equipment & Features */}
                    {location.additionalInfo?.equipment && location.additionalInfo.equipment.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Equipment:</p>
                        <div className="flex flex-wrap gap-1">
                          {location.additionalInfo.equipment.slice(0, 3).map((item, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                            >
                              {item}
                            </span>
                          ))}
                          {location.additionalInfo.equipment.length > 3 && (
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                              +{location.additionalInfo.equipment.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        location.isActive
                          ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      )}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                      
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Updated {new Date(location.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

