'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'
import { useToastHelpers } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface AttendanceData {
  date: string
  present: number
  absent: number
  late: number
  total: number
  percentage: number
}

interface ChartStats {
  totalSessions: number
  averageAttendance: number
  trend: number
  bestDay: string
  worstDay: string
}

export function AttendanceChart() {
  const [data, setData] = useState<AttendanceData[]>([])
  const [stats, setStats] = useState<ChartStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const toast = useToastHelpers()

  useEffect(() => {
    loadAttendanceData()
  }, [period])

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true)
      const response = await ApiClient.get(`/api/admin/analytics/attendance?period=${period}`)
      setData(response.data.chartData)
      setStats(response.data.stats)
    } catch (error) {
      toast.showError('Failed to load attendance data')
    } finally {
      setIsLoading(false)
    }
  }

  const getMaxValue = () => {
    return Math.max(...data.map(item => item.total)) || 100
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getBarHeight = (value: number, total: number) => {
    const maxValue = getMaxValue()
    return `${(value / maxValue) * 100}%`
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner className="w-8 h-8 text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">
            Attendance Trends
          </h3>
          {stats && (
            <div className="flex items-center space-x-2 text-sm">
              {stats.trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={cn(
                "font-medium",
                stats.trend > 0 ? "text-green-400" : "text-red-400"
              )}>
                {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
              </span>
              <span className="text-slate-400">vs last {period}</span>
            </div>
          )}
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Total Sessions</div>
            <div className="text-xl font-bold text-white">{stats.totalSessions}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Avg Attendance</div>
            <div className="text-xl font-bold text-green-400">{stats.averageAttendance.toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Best Day</div>
            <div className="text-sm font-medium text-white">{stats.bestDay}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Worst Day</div>
            <div className="text-sm font-medium text-white">{stats.worstDay}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            No data available for the selected period
          </div>
        ) : (
          <div className="h-full flex items-end justify-between space-x-2">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                {/* Bars */}
                <div className="relative w-full flex-1 flex items-end">
                  <div className="w-full bg-slate-700 rounded-t-sm relative overflow-hidden">
                    {/* Present Bar */}
                    <div
                      className="bg-green-500 transition-all duration-300"
                      style={{ height: getBarHeight(item.present, item.total) }}
                    />
                    {/* Late Bar */}
                    <div
                      className="bg-yellow-500 transition-all duration-300"
                      style={{ height: getBarHeight(item.late, item.total) }}
                    />
                    {/* Absent Bar */}
                    <div
                      className="bg-red-500 transition-all duration-300"
                      style={{ height: getBarHeight(item.absent, item.total) }}
                    />
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.present}P / {item.late}L / {item.absent}A
                  </div>
                </div>

                {/* Percentage */}
                <div className="text-xs font-medium text-white">
                  {item.percentage.toFixed(0)}%
                </div>

                {/* Date */}
                <div className="text-xs text-slate-400">
                  {formatDate(item.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-slate-300">Present</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-slate-300">Late</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-slate-300">Absent</span>
        </div>
      </div>
    </div>
  )
}