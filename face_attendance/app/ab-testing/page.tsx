'use client';

import React from 'react';
import { ABTestingProvider } from '@/contexts/ABTestingContext';
import { ABTestShowcase } from '@/components/ab-testing/ABTestExamples';
import { DEFAULT_EXPERIMENTS } from '@/lib/ab-testing-config';

export default function ABTestingPage() {
  return (
    <ABTestingProvider
      experiments={DEFAULT_EXPERIMENTS}
      storageType="localStorage"
      enabled={true}
      userContext={{
        userType: 'admin',
        location: 'web',
        metadata: {
          page: 'ab-testing-showcase'
        }
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <ABTestShowcase />
      </div>
    </ABTestingProvider>
  );
}