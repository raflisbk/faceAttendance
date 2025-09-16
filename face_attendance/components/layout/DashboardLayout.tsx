import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Camera,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  BookOpen,
  MapPin,
  BarChart3,
  Clock,
  Shield,
  ChevronDown,
  Home,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Moon,
  Sun
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { USER_ROLES } from '@/lib/constants'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  avatar?: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  studentId?: string
  employeeId?: string
  department?: string
  lastLogin?: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  createdAt: string
}

interface SystemStatus {
  online: boolean
  faceRecognition: boolean
  database: boolean
  redis: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: number
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'LECTURER', 'STUDENT']
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: Camera,
    roles: ['ADMIN', 'LECTURER', 'STUDENT']
  },
  {
    name: 'Classes',
    href: '/classes',
    icon: BookOpen,
    roles: ['ADMIN', 'LECTURER', 'STUDENT']
  },
  {
    name: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    roles: ['ADMIN', 'LECTURER', 'STUDENT']
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: ['ADMIN']
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: MapPin,
    roles: ['ADMIN']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'LECTURER']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN', 'LECTURER', 'STUDENT']
  }
]

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  className
}) => {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  )

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'LECTURER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'STUDENT': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-900", className)}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 dark:bg-slate-200 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-white dark:text-slate-800" />
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono">
              FaceAttend
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <User className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  getRoleColor(user.role)
                )}>
                  {user.role.toLowerCase()}
                </span>
                {user.status === 'PENDING' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Navigation */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16">
          <div className="flex items-center justify-between h-full px-6">
            {/* Mobile menu button */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">/</span>
                <span className="text-slate-600 dark:text-slate-400">Dashboard</span>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* Current Time */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {/* Status Banner for Pending Users */}
          {user.status === 'PENDING' && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <CardContent className="flex items-center gap-3 p-4">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Account Pending Approval
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Your account is currently under review. You'll receive an email notification once approved.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}