'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ABTestComponent, ConditionalRender, withABTest } from '@/components/ab-testing/ABTestComponent';
import { useVariant, useTrackConversion } from '@/hooks/useABTestingHooks';
import { Camera, Users, TrendingUp, Star, ArrowRight } from 'lucide-react';

function DefaultCTA() {
  return (
    <Button className="w-full">
      <Camera className="h-4 w-4 mr-2" />
      Start Attendance Check
    </Button>
  );
}

function UrgentCTA({ trackEvent }: { trackEvent?: Function }) {
  const handleClick = () => {
    trackEvent?.('cta_click', { variant: 'urgent' });
  };

  return (
    <Button
      className="w-full bg-red-600 hover:bg-red-700 text-white animate-pulse"
      onClick={handleClick}
    >
      <Users className="h-4 w-4 mr-2" />
      Check In Now - Class Starting!
    </Button>
  );
}

function MinimalCTA({ trackEvent }: { trackEvent?: Function }) {
  const handleClick = () => {
    trackEvent?.('cta_click', { variant: 'minimal' });
  };

  return (
    <Button
      variant="outline"
      className="w-full text-blue-600 border-blue-600 hover:bg-blue-50"
      onClick={handleClick}
    >
      Check Attendance
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  );
}

export function CTAButtonTest() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CTA Button A/B Test</CardTitle>
      </CardHeader>
      <CardContent>
        <ABTestComponent
          experimentId="cta_button_test"
          variants={{
            control: DefaultCTA,
            urgent: UrgentCTA,
            minimal: MinimalCTA
          }}
          defaultVariant="control"
          fallback={DefaultCTA}
        />
      </CardContent>
    </Card>
  );
}

function StandardPricing() {
  const trackConversion = useTrackConversion('pricing_test', 'plan_selected');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { name: 'Basic', price: '$29', features: ['Up to 100 students', 'Basic reporting', 'Email support'] },
        { name: 'Pro', price: '$79', features: ['Up to 500 students', 'Advanced reporting', 'Priority support', 'Analytics'] },
        { name: 'Enterprise', price: '$199', features: ['Unlimited students', 'Custom reporting', '24/7 support', 'API access'] }
      ].map((plan, index) => (
        <Card key={index} className={index === 1 ? 'border-blue-500 shadow-lg' : ''}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{plan.name}</CardTitle>
              {index === 1 && <Badge className="bg-blue-500">Popular</Badge>}
            </div>
            <p className="text-3xl font-bold">{plan.price}<span className="text-sm text-gray-500">/month</span></p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Star className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={index === 1 ? 'default' : 'outline'}
              onClick={() => trackConversion({ plan: plan.name, price: plan.price })}
            >
              Choose {plan.name}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SimplifiedPricing() {
  const trackConversion = useTrackConversion('pricing_test', 'plan_selected');

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-green-500 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Solution</CardTitle>
          <p className="text-4xl font-bold text-green-600">$99<span className="text-sm text-gray-500">/month</span></p>
          <p className="text-gray-600">Everything you need for attendance management</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 mb-6">
            {[
              'Unlimited students',
              'Advanced facial recognition',
              'Real-time reporting',
              'Mobile app access',
              '24/7 support',
              'API integration'
            ].map((feature, i) => (
              <li key={i} className="flex items-center">
                <Star className="h-4 w-4 text-green-500 mr-3" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
            onClick={() => trackConversion({ plan: 'Complete', price: '$99' })}
          >
            Start Free Trial
          </Button>
          <p className="text-center text-sm text-gray-500 mt-3">
            14-day free trial • No credit card required
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PricingTest() {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-gray-600 mt-2">Select the perfect plan for your institution</p>
      </div>

      <ABTestComponent
        experimentId="pricing_test"
        variants={{
          control: StandardPricing,
          simplified: SimplifiedPricing
        }}
        defaultVariant="control"
        fallback={StandardPricing}
      />
    </div>
  );
}

export function FeatureFlagExample() {
  const { variant } = useVariant('feature_flags_test');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flag Example</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">This content is always visible.</p>

        <ConditionalRender
          experimentId="feature_flags_test"
          variantIds={['beta_features']}
          fallback={<p className="text-gray-500">Beta features are not enabled for your account.</p>}
        >
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800">🎉 New Beta Feature!</h4>
            <p className="text-blue-700 mt-2">
              Advanced analytics dashboard with real-time insights and predictive attendance modeling.
            </p>
            <Button size="sm" className="mt-3">
              Try Beta Features
            </Button>
          </div>
        </ConditionalRender>

        <div className="mt-4 text-sm text-gray-600">
          Current variant: <Badge>{variant || 'none'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsletterSignupControl({ trackEvent }: { trackEvent?: Function }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stay Updated</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Subscribe to our newsletter for the latest updates and features.
        </p>
        <div className="flex gap-2">
          <Input placeholder="Enter your email" className="flex-1" />
          <Button onClick={() => trackEvent?.('newsletter_signup', { variant: 'control' })}>
            Subscribe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsletterSignupBenefit({ trackEvent }: { trackEvent?: Function }) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800">🚀 Get Exclusive Access</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4 text-sm text-blue-700">
          <li>• Early access to new features</li>
          <li>• Monthly attendance insights</li>
          <li>• Best practice guides</li>
          <li>• Product roadmap updates</li>
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Your email address" className="flex-1" />
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => trackEvent?.('newsletter_signup', { variant: 'benefit' })}
          >
            Join Now
          </Button>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          ✓ No spam, unsubscribe anytime
        </p>
      </CardContent>
    </Card>
  );
}

export function NewsletterTest() {
  return (
    <ABTestComponent
      experimentId="newsletter_test"
      variants={{
        control: NewsletterSignupControl,
        benefit: NewsletterSignupBenefit
      }}
      defaultVariant="control"
      fallback={NewsletterSignupControl}
    />
  );
}

const EnhancedButton = withABTest(Button, 'button_style_test', 'enhanced');

export function HighOrderComponentExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>HOC A/B Test Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>This button is wrapped with A/B testing HOC:</p>
        <EnhancedButton className="w-full">
          Enhanced Button Component
        </EnhancedButton>
      </CardContent>
    </Card>
  );
}

export function ABTestShowcase() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">A/B Testing Examples</h1>
        <p className="text-gray-600">
          This page demonstrates various A/B testing implementations in the Face Attendance system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CTAButtonTest />
        <FeatureFlagExample />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NewsletterTest />
        <HighOrderComponentExample />
      </div>

      <PricingTest />
    </div>
  );
}