'use client';

import React from 'react';
import { ABTestingProvider } from '@/contexts/ABTestingContext';
import { ABTestingDashboard } from '@/components/admin/ABTestingDashboard';
import { DEFAULT_EXPERIMENTS } from '@/lib/ab-testing-config';

export default function ABTestingDashboardPage() {
  return (
    <ABTestingProvider
      experiments={DEFAULT_EXPERIMENTS}
      storageType="localStorage"
      enabled={true}
      userContext={{
        userType: 'admin',
        location: 'web',
        metadata: {
          page: 'ab-testing-dashboard'
        }
      }}
    >
      <div className="min-h-screen bg-gray-50 p-6">
        <ABTestingDashboard />
      </div>
    </ABTestingProvider>
  );
}