// app/locations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MapPin,
  Building,
  Wifi,
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Settings,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

interface Location {
  id: string
  name: string
  building: string
  floor: string
  capacity: number
  wifiSSID: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  status: 'ACTIVE' | 'INACTIVE'
  classes: Array<{
    id: string
    name: string
    code: string
    status: string
  }>
  _count: {
    classes: number
  }
  createdAt: string
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    building: '',
    status: ''
  })
  
  const { user } = useAuthStore()
  const toast = useToastHelpers()

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadLocations()
    }
  }, [user, currentPage, filters])

  const loadLocations = async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })
      
      const response = await ApiClient.get<{
        data: Location[]
        pagination: {
          totalPages: number
        }
      }>(`/api/location?${params}`)

      if (response.success && response.data) {
        setLocations(response.data.data)
        setTotalPages(response.data.pagination.totalPages)
      }
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load locations'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return
    }

    try {
      await ApiClient.delete(`/api/location/${locationId}`)
      toast.success('Location deleted successfully')
      await loadLocations()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete location'
      toast.error(errorMessage)
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">Admin access required to manage locations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Location Management</h1>
            <p className="text-slate-400">Manage classrooms, labs, and facilities</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={loadLocations}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              onClick={() => window.location.href = '/locations/create'}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search locations..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <Select
                value={filters.building}
                onValueChange={(value) => setFilters({ ...filters, building: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Buildings</SelectItem>
                  <SelectItem value="Main Building">Main Building</SelectItem>
                  <SelectItem value="Science Building">Science Building</SelectItem>
                  <SelectItem value="Engineering Building">Engineering Building</SelectItem>
                  <SelectItem value="Library">Library</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setFilters({ search: '', building: '', status: '' })}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locations Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner className="w-8 h-8 text-white mx-auto" />
          </div>
        ) : locations.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Locations Found</h3>
              <p className="text-slate-400 mb-6">
                No locations match your current filters.
              </p>
              <Button
                onClick={() => window.location.href = '/locations/create'}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className={cn(
                    "bg-slate-900/50 border-slate-800 backdrop-blur-sm transition-all hover:bg-slate-900/70",
                    location.status === 'INACTIVE' && "opacity-60"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <MapPin className="w-5 h-5 text-slate-400" />
                          <span>{location.name}</span>
                        </CardTitle>
                        <p className="text-slate-400 mt-1">
                          {location.building} • Floor {location.floor}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/locations/${location.id}/edit`}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          Capacity: {location.capacity}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {location._count.classes} classes
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Wifi className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">WiFi Network</span>
                      </div>
                      <p className="text-sm text-slate-400 font-mono">
                        {location.wifiSSID}
                      </p>
                    </div>

                    {location.classes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-300 mb-2">Active Classes:</p>
                        <div className="space-y-1">
                          {location.classes.slice(0, 3).map((cls) => (
                            <div key={cls.id} className="text-xs text-slate-400">
                              {cls.name} ({cls.code})
                            </div>
                          ))}
                          {location.classes.length > 3 && (
                            <div className="text-xs text-slate-500">
                              +{location.classes.length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        location.status === 'ACTIVE' 
                          ? "bg-green-900/20 text-green-400" 
                          : "bg-gray-900/20 text-gray-400"
                      )}>
                        {location.status}
                      </span>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/locations/${location.id}`}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Previous
                </Button>
                
                <span className="text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}