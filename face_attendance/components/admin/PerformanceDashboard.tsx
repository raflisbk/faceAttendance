'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { performanceMonitor } from '@/lib/performance-monitor'
import { getCacheStats } from '@/lib/advanced-cache'
import {
  Activity,
  Zap,
  Database,
  Monitor,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'

interface PerformanceStats {
  metrics: Record<string, { avg: number; min: number; max: number; count: number }>
  webVitals: Array<{ name: string; value: number; rating: string }>
  issues: Array<{ name: string; value: number; timestamp: number }>
}

export function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadStats()

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(loadStats, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const loadStats = async () => {
    try {
      setLoading(true)

      // Get performance stats
      const perfStats = performanceMonitor.getPerformanceSummary()
      setStats(perfStats)

      // Get cache stats
      const cacheData = getCacheStats()
      setCacheStats(cacheData)

    } catch (error) {
      console.error('Failed to load performance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportStats = () => {
    const data = performanceMonitor.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearStats = () => {
    performanceMonitor.clearMetrics()
    loadStats()
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getScoreColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getScoreIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'needs-improvement': return <Clock className="w-4 h-4" />
      case 'poor': return <AlertTriangle className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-pixel-small">Loading performance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-pixel-2">Performance Dashboard</h1>
          <p className="text-pixel-small text-muted-foreground">
            Real-time performance monitoring and analytics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            className="btn-pixel-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>

          <Button onClick={loadStats} className="btn-pixel-secondary">
            <Monitor className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={exportStats} className="btn-pixel-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button onClick={clearStats} variant="destructive" className="btn-pixel-secondary">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Web Vitals */}
      {stats?.webVitals && stats.webVitals.length > 0 && (
        <Card className="pixel-card">
          <CardHeader>
            <CardTitle className="heading-pixel-3 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Web Vitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats.webVitals.map((vital, index) => (
                <div key={index} className="text-center p-4 pixel-border bg-muted/20">
                  <div className={`flex items-center justify-center mb-2 ${getScoreColor(vital.rating)}`}>
                    {getScoreIcon(vital.rating)}
                    <span className="ml-2 text-pixel font-bold">{vital.name}</span>
                  </div>
                  <div className="text-pixel text-2xl font-bold">
                    {formatTime(vital.value)}
                  </div>
                  <Badge
                    variant={vital.rating === 'good' ? 'default' : vital.rating === 'needs-improvement' ? 'secondary' : 'destructive'}
                    className="mt-2"
                  >
                    {vital.rating}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {stats?.metrics && Object.keys(stats.metrics).length > 0 && (
        <Card className="pixel-card">
          <CardHeader>
            <CardTitle className="heading-pixel-3 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.metrics).map(([name, metric]) => (
                <div key={name} className="flex items-center justify-between p-3 pixel-border bg-muted/10">
                  <div>
                    <h4 className="text-pixel font-medium">{name}</h4>
                    <p className="text-pixel-small text-muted-foreground">
                      {metric.count} measurements
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-pixel font-bold">
                      Avg: {formatTime(metric.avg)}
                    </div>
                    <div className="text-pixel-small text-muted-foreground">
                      {formatTime(metric.min)} - {formatTime(metric.max)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Statistics */}
      {cacheStats && (
        <Card className="pixel-card">
          <CardHeader>
            <CardTitle className="heading-pixel-3 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Cache Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(cacheStats).map(([cacheName, stats]: [string, any]) => (
                <div key={cacheName} className="p-4 pixel-border bg-muted/20">
                  <h4 className="text-pixel font-medium mb-3 capitalize">{cacheName} Cache</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-pixel-small">Entries:</span>
                      <span className="text-pixel-small font-bold">{stats.entries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pixel-small">Hit Rate:</span>
                      <span className="text-pixel-small font-bold">{stats.hitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pixel-small">Memory:</span>
                      <span className="text-pixel-small font-bold">{stats.memoryUsage}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Issues */}
      {stats?.issues && stats.issues.length > 0 && (
        <Card className="pixel-card">
          <CardHeader>
            <CardTitle className="heading-pixel-3 flex items-center text-destructive">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Performance Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.issues.slice(0, 10).map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 pixel-border bg-destructive/10">
                  <div>
                    <h4 className="text-pixel font-medium text-destructive">{issue.name}</h4>
                    <p className="text-pixel-small text-muted-foreground">
                      {new Date(issue.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-destructive font-bold">
                    {formatTime(issue.value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="pixel-card">
        <CardHeader>
          <CardTitle className="heading-pixel-3 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Quick Performance Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => {
                // Clear all caches
                window.location.reload()
              }}
              className="btn-pixel-secondary h-auto p-4 flex-col"
            >
              <RefreshCw className="w-6 h-6 mb-2" />
              <span>Clear Caches</span>
            </Button>

            <Button
              onClick={() => {
                // Force garbage collection if available
                if ('gc' in window) {
                  (window as any).gc()
                }
              }}
              className="btn-pixel-secondary h-auto p-4 flex-col"
            >
              <Database className="w-6 h-6 mb-2" />
              <span>Free Memory</span>
            </Button>

            <Button
              onClick={() => {
                // Preload critical resources
                const link = document.createElement('link')
                link.rel = 'prefetch'
                link.href = '/api/dashboard/stats'
                document.head.appendChild(link)
              }}
              className="btn-pixel-secondary h-auto p-4 flex-col"
            >
              <Download className="w-6 h-6 mb-2" />
              <span>Preload Assets</span>
            </Button>

            <Button
              onClick={() => {
                // Open DevTools Performance tab
                console.log('Open DevTools Performance tab to analyze detailed performance metrics')
              }}
              className="btn-pixel-secondary h-auto p-4 flex-col"
            >
              <Monitor className="w-6 h-6 mb-2" />
              <span>DevTools</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <div className="text-center p-4 pixel-border bg-muted/10">
        <p className="text-pixel-small text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
          {autoRefresh && <span className="ml-2 text-green-600">• Live</span>}
        </p>
      </div>
    </div>
  )
}