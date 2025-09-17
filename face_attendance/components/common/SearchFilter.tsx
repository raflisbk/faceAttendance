import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  X,
  Calendar,
  SlidersHorizontal,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
  count?: number
  color?: string
}

interface DateRange {
  start: string
  end: string
  label: string
}

interface SearchFilterProps {
  searchPlaceholder?: string
  onSearchChange: (search: string) => void
  onFiltersChange: (filters: Record<string, any>) => void
  filters?: {
    name: string
    label: string
    type: 'select' | 'multiselect' | 'date' | 'daterange' | 'toggle' | 'number'
    options?: FilterOption[]
    value?: any
    placeholder?: string
    min?: number
    max?: number
  }[]
  quickFilters?: {
    name: string
    label: string
    value: any
    count?: number
  }[]
  dateRangePresets?: DateRange[]
  showExport?: boolean
  showRefresh?: boolean
  onExport?: () => void
  onRefresh?: () => void
  collapsible?: boolean
  className?: string
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchPlaceholder = "Search...",
  onSearchChange,
  onFiltersChange,
  filters = [],
  quickFilters = [],
  dateRangePresets = [],
  showExport = false,
  showRefresh = false,
  onExport,
  onRefresh,
  collapsible = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, any>>({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    onSearchChange(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  // Initialize filter values
  useEffect(() => {
    const initialValues: Record<string, any> = {}
    filters.forEach(filter => {
      if (filter.value !== undefined) {
        initialValues[filter.name] = filter.value
      } else {
        switch (filter.type) {
          case 'multiselect':
            initialValues[filter.name] = []
            break
          case 'toggle':
            initialValues[filter.name] = false
            break
          case 'number':
            initialValues[filter.name] = filter.min || 0
            break
          default:
            initialValues[filter.name] = ''
        }
      }
    })
    setFilterValues(initialValues)
  }, [filters])

  // Count active filters
  useEffect(() => {
    const count = Object.entries(filterValues).filter(([_key, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value !== ''
      if (typeof value === 'number') return value > 0
      return false
    }).length
    setActiveFiltersCount(count)
  }, [filterValues])

  const handleFilterChange = useCallback((filterName: string, value: any) => {
    const newFilterValues = { ...filterValues, [filterName]: value }
    setFilterValues(newFilterValues)
    onFiltersChange(newFilterValues)
  }, [filterValues, onFiltersChange])

  const handleQuickFilter = useCallback((filterName: string, filterValue: any) => {
    handleFilterChange(filterName, filterValue)
  }, [handleFilterChange])

  const clearFilters = useCallback(() => {
    const clearedValues: Record<string, any> = {}
    filters.forEach(filter => {
      switch (filter.type) {
        case 'multiselect':
          clearedValues[filter.name] = []
          break
        case 'toggle':
          clearedValues[filter.name] = false
          break
        case 'number':
          clearedValues[filter.name] = filter.min || 0
          break
        default:
          clearedValues[filter.name] = ''
      }
    })
    setFilterValues(clearedValues)
    setSearchTerm('')
    onSearchChange('')
    onFiltersChange(clearedValues)
  }, [filters, onSearchChange, onFiltersChange])

  const clearSearch = () => {
    setSearchTerm('')
  }

  const renderFilter = (filter: any) => {
    const value = filterValues[filter.name]

    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFilterChange(filter.name, val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All {filter.label}</SelectItem>
              {filter.options?.map((option: FilterOption) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-slate-500 ml-2">({option.count})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            <Select
              onValueChange={(val) => {
                if (val && !value.includes(val)) {
                  handleFilterChange(filter.name, [...value, val])
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option: FilterOption) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {value.map((item: string) => {
                  const option = filter.options?.find((o: FilterOption) => o.value === item)
                  return (
                    <div
                      key={item}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs"
                    >
                      <span>{option?.label || item}</span>
                      <button
                        onClick={() => handleFilterChange(
                          filter.name, 
                          value.filter((v: string) => v !== item)
                        )}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
          />
        )

      case 'daterange':
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="Start date"
              value={value.start || ''}
              onChange={(e) => handleFilterChange(filter.name, { ...value, start: e.target.value })}
            />
            <Input
              type="date"
              placeholder="End date"
              value={value.end || ''}
              onChange={(e) => handleFilterChange(filter.name, { ...value, end: e.target.value })}
            />
          </div>
        )

      case 'toggle':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFilterChange(filter.name, e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{filter.label}</span>
          </label>
        )

      case 'number':
        return (
          <Input
            type="number"
            min={filter.min}
            max={filter.max}
            value={value}
            onChange={(e) => handleFilterChange(filter.name, parseInt(e.target.value) || 0)}
            placeholder={filter.placeholder}
          />
        )

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            placeholder={filter.placeholder || `Enter ${filter.label}`}
          />
        )
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {collapsible && (
                <Button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </Button>
              )}

              {showRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="chalkOutline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              {showExport && (
                <Button
                  onClick={onExport}
                  variant="chalkOutline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}

              {(activeFiltersCount > 0 || searchTerm) && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          {quickFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((quickFilter) => (
                <Button
                  key={quickFilter.name}
                  onClick={() => handleQuickFilter(quickFilter.name, quickFilter.value)}
                  variant="chalkOutline"
                  size="sm"
                  className="text-xs"
                >
                  {quickFilter.label}
                  {quickFilter.count !== undefined && (
                    <span className="ml-1 text-slate-500">({quickFilter.count})</span>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Date Range Presets */}
          {dateRangePresets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dateRangePresets.map((preset) => (
                <Button
                  key={preset.label}
                  onClick={() => handleFilterChange('dateRange', { start: preset.start, end: preset.end })}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Filters */}
          {!isCollapsed && filters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filters.map((filter) => (
                <div key={filter.name} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {filter.label}
                  </label>
                  {renderFilter(filter)}
                </div>
              ))}
            </div>
          )}

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              <span>{activeFiltersCount} filter(s) active</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}