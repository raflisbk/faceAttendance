'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Database,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    model: string
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  network: {
    status: 'online' | 'offline' | 'degraded'
    latency: number
    throughput: number
  }
  database: {
    status: 'connected' | 'disconnected' | 'error'
    connections: number
    queryTime: number
  }
  services: {
    faceApi: 'healthy' | 'degraded' | 'down'
    redis: 'healthy' | 'degraded' | 'down'
    email: 'healthy' | 'degraded' | 'down'
    storage: 'healthy' | 'degraded' | 'down'
  }
  performance: {
    uptime: number
    responseTime: number
    errorRate: number
    throughput: number
  }
  lastUpdated: string
}

interface SystemHealthProps {
  className?: string
}

export default function SystemHealth({ className }: SystemHealthProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setError(null)
        const response = await fetch('/api/admin/system-health')

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        console.error('Failed to fetch system metrics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch system metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()

    // Auto refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'online':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'down':
      case 'disconnected':
      case 'offline':
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'online':
        return <CheckCircle className="w-4 h-4" />
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />
      case 'down':
      case 'disconnected':
      case 'offline':
      case 'error':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <LoadingSpinner size="lg" text="Loading system health..." className="py-12" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system health: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No system metrics available
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                <p className="text-2xl font-bold">{metrics.cpu.usage}%</p>
              </div>
              <Cpu className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={metrics.cpu.usage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.cpu.cores} cores • {metrics.cpu.model}
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Memory</p>
                <p className="text-2xl font-bold">{metrics.memory.percentage}%</p>
              </div>
              <MemoryStick className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={metrics.memory.percentage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disk Space</p>
                <p className="text-2xl font-bold">{metrics.disk.percentage}%</p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={metrics.disk.percentage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
            </p>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Network</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <span className={getStatusColor(metrics.network.status)}>
                    {getStatusIcon(metrics.network.status)}
                  </span>
                  {metrics.network.latency}ms
                </p>
              </div>
              <Wifi className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status: {metrics.network.status} • {formatBytes(metrics.network.throughput)}/s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={getStatusColor(status)}>
                      {getStatusIcon(status)}
                    </span>
                    <span className="font-medium capitalize">
                      {service === 'faceApi' ? 'Face API' : service}
                    </span>
                  </div>
                  <Badge
                    variant={status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive'}
                  >
                    {status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Status</span>
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(metrics.database.status)}>
                    {getStatusIcon(metrics.database.status)}
                  </span>
                  <Badge
                    variant={metrics.database.status === 'connected' ? 'default' : 'destructive'}
                  >
                    {metrics.database.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Connections</span>
                <span className="font-mono">{metrics.database.connections}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Query Time</span>
                <span className="font-mono">{metrics.database.queryTime}ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Uptime</span>
                <span className="font-mono">{formatUptime(metrics.performance.uptime)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Time</span>
                <span className="font-mono">{metrics.performance.responseTime}ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{metrics.performance.errorRate}%</span>
                  {metrics.performance.errorRate > 5 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto Refresh Toggle */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <span>Auto-refresh (30s)</span>
        </label>
      </div>
    </div>
  )
}