'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ABTestComponent, VariantSwitch, VariantCase } from '@/components/ab-testing/ABTestComponent';
import { useVariant, useExperimentConfig } from '@/contexts/ABTestingContext';
import { useClickTracking, usePageViewTracking } from '@/hooks/useABTestingHooks';
import {
  Users,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardVariantProps {
  trackEvent?: (event: string, value?: any, metadata?: Record<string, any>) => void;
  variant?: string;
}

function CompactDashboard({ trackEvent }: DashboardVariantProps) {
  const trackClick = useClickTracking('dashboard_layout_test');
  usePageViewTracking('dashboard_layout_test', 'compact_dashboard');

  const stats = [
    { title: 'Total Students', value: '1,234', icon: Users, change: '+12%' },
    { title: 'Present Today', value: '987', icon: CheckCircle, change: '+5%' },
    { title: 'Attendance Rate', value: '94.2%', icon: TrendingUp, change: '+2.1%' },
    { title: 'Late Arrivals', value: '23', icon: Clock, change: '-8%' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => trackClick(`compact_stat_${stat.title.toLowerCase().replace(' ', '_')}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">{stat.title}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-green-600">{stat.change}</p>
                </div>
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full justify-start"
              onClick={() => trackClick('compact_quick_checkin')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check In Students
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => trackClick('compact_quick_report')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span>John Doe checked in</span>
                <span className="text-gray-500">2 min ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Jane Smith marked present</span>
                <span className="text-gray-500">5 min ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Report generated</span>
                <span className="text-gray-500">10 min ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailedDashboard({ trackEvent }: DashboardVariantProps) {
  const trackClick = useClickTracking('dashboard_layout_test');
  usePageViewTracking('dashboard_layout_test', 'detailed_dashboard');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Students', value: '1,234', icon: Users, description: 'Enrolled students' },
          { title: 'Present Today', value: '987', icon: CheckCircle, description: '94.2% attendance rate' },
          { title: 'Classes Active', value: '15', icon: Calendar, description: 'Currently running' },
          { title: 'Weekly Average', value: '92.8%', icon: TrendingUp, description: 'This week' }
        ].map((stat, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => trackClick(`detailed_stat_${stat.title.toLowerCase().replace(' ', '_')}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { class: 'Computer Science 101', present: 45, total: 50, percentage: 90 },
                { class: 'Mathematics 201', present: 38, total: 42, percentage: 90.5 },
                { class: 'Physics 301', present: 28, total: 35, percentage: 80 }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.class}</span>
                    <span>{item.present}/{item.total} ({item.percentage}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => trackClick('detailed_quick_checkin')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Start Check-in
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => trackClick('detailed_view_reports')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => trackClick('detailed_manage_classes')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Classes
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: 'John Doe', action: 'checked in', time: '2 minutes ago', status: 'present' },
                { user: 'Jane Smith', action: 'marked present', time: '5 minutes ago', status: 'present' },
                { user: 'Bob Johnson', action: 'marked late', time: '8 minutes ago', status: 'late' },
                { user: 'Alice Brown', action: 'checked in', time: '12 minutes ago', status: 'present' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={activity.status === 'present' ? 'default' : 'secondary'}>
                      {activity.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Attendance Rate Improved</p>
                  <p className="text-xs text-gray-500">Up 2.3% from last week</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Goal Progress</p>
                  <p className="text-xs text-gray-500">95% attendance target: 94.2%</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Late Arrivals</p>
                  <p className="text-xs text-gray-500">23 students today</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CardGridDashboard({ trackEvent }: DashboardVariantProps) {
  const trackClick = useClickTracking('dashboard_layout_test');
  usePageViewTracking('dashboard_layout_test', 'card_grid_dashboard');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[
        { title: 'Total Students', value: '1,234', icon: Users, color: 'bg-blue-500' },
        { title: 'Present Today', value: '987', icon: CheckCircle, color: 'bg-green-500' },
        { title: 'Attendance Rate', value: '94.2%', icon: TrendingUp, color: 'bg-purple-500' },
        { title: 'Late Arrivals', value: '23', icon: Clock, color: 'bg-orange-500' },
        { title: 'Classes Running', value: '15', icon: Calendar, color: 'bg-red-500' },
        { title: 'Reports Generated', value: '8', icon: BarChart3, color: 'bg-indigo-500' },
        { title: 'Weekly Average', value: '92.8%', icon: PieChart, color: 'bg-pink-500' },
        { title: 'System Status', value: 'Online', icon: Activity, color: 'bg-teal-500' }
      ].map((card, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          onClick={() => trackClick(`card_grid_${card.title.toLowerCase().replace(' ', '_')}`)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ABTestDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      <VariantSwitch experimentId="dashboard_layout_test" defaultVariant="control">
        <VariantCase variantId="control">
          <DetailedDashboard />
        </VariantCase>
        <VariantCase variantId="compact">
          <CompactDashboard />
        </VariantCase>
        <VariantCase variantId="card_grid">
          <CardGridDashboard />
        </VariantCase>
        <VariantCase isDefault>
          <DetailedDashboard />
        </VariantCase>
      </VariantSwitch>
    </div>
  );
}