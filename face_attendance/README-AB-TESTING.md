# A/B Testing Implementation Guide

## Overview

This Face Attendance system now includes a comprehensive A/B testing framework that allows you to run experiments on various UI components, user flows, and features. The framework is built with TypeScript, React, and Next.js, providing type safety and excellent developer experience.

## Quick Start

### 1. Setup ABTestingProvider

Wrap your app or specific pages with the `ABTestingProvider`:

```tsx
import { ABTestingProvider } from '@/contexts/ABTestingContext';
import { DEFAULT_EXPERIMENTS } from '@/lib/ab-testing-config';

function App() {
  return (
    <ABTestingProvider
      experiments={DEFAULT_EXPERIMENTS}
      storageType="localStorage" // or 'cookie' or 'database'
      enabled={true}
      userId="user123" // optional
      userContext={{
        userType: 'student',
        location: 'web'
      }}
    >
      <YourApp />
    </ABTestingProvider>
  );
}
```

### 2. Use A/B Testing Components

#### Simple Component Testing
```tsx
import { ABTestComponent } from '@/components/ab-testing/ABTestComponent';

function MyPage() {
  return (
    <ABTestComponent
      experimentId="login_form_test"
      variants={{
        control: OriginalLoginForm,
        variant_a: NewLoginForm
      }}
      defaultVariant="control"
      fallback={OriginalLoginForm}
    />
  );
}
```

#### Conditional Rendering
```tsx
import { ConditionalRender } from '@/components/ab-testing/ABTestComponent';

function FeatureSection() {
  return (
    <ConditionalRender
      experimentId="beta_features_test"
      variantIds={['beta_enabled']}
      fallback={<p>Feature not available</p>}
    >
      <BetaFeatureComponent />
    </ConditionalRender>
  );
}
```

#### Variant Switch
```tsx
import { VariantSwitch, VariantCase } from '@/components/ab-testing/ABTestComponent';

function Dashboard() {
  return (
    <VariantSwitch experimentId="dashboard_layout_test">
      <VariantCase variantId="control">
        <StandardDashboard />
      </VariantCase>
      <VariantCase variantId="compact">
        <CompactDashboard />
      </VariantCase>
      <VariantCase isDefault>
        <StandardDashboard />
      </VariantCase>
    </VariantSwitch>
  );
}
```

### 3. Use Hooks for Advanced Functionality

#### Basic Variant Hook
```tsx
import { useVariant } from '@/hooks/useABTestingHooks';

function MyComponent() {
  const { variant, trackEvent } = useVariant('button_color_test');

  const buttonColor = variant === 'red' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <button
      className={buttonColor}
      onClick={() => trackEvent('button_click')}
    >
      Click me
    </button>
  );
}
```

#### Conversion Tracking
```tsx
import { useTrackConversion } from '@/hooks/useABTestingHooks';

function CheckoutForm() {
  const trackConversion = useTrackConversion('checkout_flow_test', 'purchase_completed');

  const handlePurchase = () => {
    // Handle purchase logic
    trackConversion({ amount: 99.99, items: 3 });
  };

  return <form onSubmit={handlePurchase}>...</form>;
}
```

#### Form Tracking
```tsx
import { useFormTracking } from '@/hooks/useABTestingHooks';

function LoginForm() {
  const { trackFormStart, trackFormSubmit, trackFormError } = useFormTracking('login_test');

  useEffect(() => {
    trackFormStart('login_form');
  }, []);

  const handleSubmit = async (data) => {
    try {
      await loginUser(data);
      trackFormSubmit('login_form', true);
    } catch (error) {
      trackFormError('login_form', error.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Storage Options

### LocalStorage (Default)
- Best for: Development and simple setups
- Persists across browser sessions
- No server setup required

### Cookie-based
- Best for: SSR applications
- Shared across subdomains
- Size limitations apply

### Database-backed
- Best for: Production environments
- Centralized data storage
- Requires API endpoints (included)

## Creating Experiments

### 1. Define Your Experiment

```typescript
const newExperiment: Experiment = {
  id: 'pricing_page_test',
  name: 'Pricing Page Layout Test',
  description: 'Testing different pricing layouts for conversion',
  status: 'active',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
  variants: [
    {
      id: 'control',
      name: 'Original 3-Tier',
      allocation: 50,
      config: {
        layout: 'three_tier',
        showFeatures: true
      }
    },
    {
      id: 'simplified',
      name: 'Single Tier Focus',
      allocation: 50,
      config: {
        layout: 'single_tier',
        emphasizeValue: true
      }
    }
  ],
  targetAudience: {
    userTypes: ['potential_customer'],
    percentage: 100
  },
  conversionGoals: [
    {
      id: 'plan_selected',
      name: 'Plan Selected',
      type: 'click',
      value: 'pricing_button'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### 2. Add to Configuration

Add your experiment to `lib/ab-testing-config.ts`:

```typescript
export const DEFAULT_EXPERIMENTS: Experiment[] = [
  // ... existing experiments
  newExperiment
];
```

## Analytics and Tracking

### Automatic Tracking
The framework automatically tracks:
- Variant assignments
- Page views
- Component renders

### Custom Event Tracking
```tsx
const { trackEvent } = useVariant('experiment_id');

// Track custom events
trackEvent('custom_action', {
  value: 'some_value',
  metadata: { context: 'additional_info' }
});
```

### Performance Tracking
```tsx
import { usePerformanceTracking } from '@/hooks/useABTestingHooks';

function MyPage() {
  usePerformanceTracking('page_performance_test');

  return <div>Your page content</div>;
}
```

### Scroll Tracking
```tsx
import { useScrollTracking } from '@/hooks/useABTestingHooks';

function LongPage() {
  useScrollTracking('content_engagement_test', [25, 50, 75, 90]);

  return <div>Long content...</div>;
}
```

## Admin Dashboard

Access the A/B testing dashboard at `/ab-testing/dashboard` to:

- Monitor active experiments
- View real-time results
- Analyze conversion rates
- Manage experiment status
- View statistical significance

## API Endpoints

The framework includes these API endpoints:

- `POST /api/ab-testing/track` - Track events
- `POST /api/ab-testing/assignment` - Create user assignments
- `GET /api/ab-testing/assignment/[experimentId]/[userId]` - Get user assignment
- `GET /api/ab-testing/results/[experimentId]` - Get experiment results
- `GET /api/ab-testing/config/[experimentId]/[variantId]` - Get variant config

## Best Practices

### 1. Experiment Design
- Start with a hypothesis
- Define clear success metrics
- Run experiments for statistically significant periods
- Test one variable at a time

### 2. Implementation
- Always provide fallbacks
- Use semantic variant names
- Track meaningful events
- Handle loading states

### 3. Analysis
- Wait for statistical significance
- Consider external factors
- Document learnings
- Implement winning variants

## Example Implementations

### Login Form Test
```tsx
// Original login form vs horizontal layout
<ABTestComponent
  experimentId="login_form_test"
  variants={{
    control: StandardLoginForm,
    horizontal: HorizontalLoginForm
  }}
  defaultVariant="control"
/>
```

### Dashboard Layout Test
```tsx
// Different dashboard layouts
<VariantSwitch experimentId="dashboard_layout_test">
  <VariantCase variantId="detailed">
    <DetailedDashboard />
  </VariantCase>
  <VariantCase variantId="compact">
    <CompactDashboard />
  </VariantCase>
</VariantSwitch>
```

### Feature Flag Example
```tsx
// Gradual feature rollout
<ConditionalRender
  experimentId="beta_features"
  variantIds={['beta_enabled']}
>
  <NewBetaFeature />
</ConditionalRender>
```

## Testing Your Implementation

1. Visit `/ab-testing` to see example implementations
2. Check browser DevTools for console logs
3. Verify localStorage for variant assignments
4. Use the dashboard to monitor results

## TypeScript Support

The framework is fully typed with TypeScript:

```typescript
import { Experiment, ExperimentVariant } from '@/lib/ab-testing';

const experiment: Experiment = {
  // Fully typed experiment definition
};
```

## Contributing

When adding new A/B tests:

1. Define your experiment in `lib/ab-testing-config.ts`
2. Create variant components
3. Add tracking events
4. Test thoroughly
5. Monitor results in the dashboard

---

For more advanced usage and customization, check the source code in:
- `lib/ab-testing.ts` - Core logic
- `contexts/ABTestingContext.tsx` - React context
- `components/ab-testing/` - Components
- `hooks/useABTestingHooks.ts` - Hooks