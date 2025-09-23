'use client';

import React from 'react';
import { LoginForm } from './LoginForm';
import { ABTestComponent } from '@/components/ab-testing/ABTestComponent';
import { useExperimentConfig } from '@/contexts/ABTestingContext';
import { useFormTracking } from '@/hooks/useABTestingHooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LoginFormVariantProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
  trackEvent?: (event: string, value?: any, metadata?: Record<string, any>) => void;
  variant?: string;
}

function ControlLoginForm(props: LoginFormVariantProps) {
  const { trackEvent } = useFormTracking('login_form_test');

  React.useEffect(() => {
    trackEvent('form_view', { variant: 'control' });
  }, [trackEvent]);

  return (
    <div
      onClick={() => trackEvent('form_interaction', { variant: 'control', action: 'click' })}
    >
      <LoginForm {...props} />
    </div>
  );
}

function HorizontalLayoutVariant({ onSuccess, redirectTo, className }: LoginFormVariantProps) {
  const config = useExperimentConfig('login_form_test', 'variant_a');
  const { trackFormStart, trackFormSubmit, trackFormError } = useFormTracking('login_form_test');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    trackFormStart('login_form_horizontal');
  }, [trackFormStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      trackFormSubmit('login_form_horizontal', true);

      if (onSuccess) onSuccess();
    } catch (error) {
      trackFormError('login_form_horizontal', 'submission_failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <Card className="shadow-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-slate-800 dark:bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Camera className="w-8 h-8 text-white dark:text-slate-800" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
            FaceAttend
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    icon={<Mail className="w-4 h-4" />}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      icon={<Lock className="w-4 h-4" />}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <label className="text-sm">Remember me for 30 days</label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: config?.buttonColor || '#10b981' }}
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    config?.buttonText || 'Login Now'
                  )}
                </Button>

                <div className="text-center text-sm space-y-2">
                  <a href="/forgot-password" className="text-blue-600 hover:underline">
                    Forgot your password?
                  </a>
                  <div>
                    <span className="text-slate-600">Don't have an account? </span>
                    <a href="/register" className="text-blue-600 hover:underline">
                      Create one
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ModernGradientVariant({ onSuccess, redirectTo, className }: LoginFormVariantProps) {
  const { trackFormStart, trackFormSubmit } = useFormTracking('login_form_test');
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    trackFormStart('login_form_gradient');
  }, [trackFormStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      trackFormSubmit('login_form_gradient', true);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            FaceAttend
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Welcome back! Please sign in
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Email address"
              className="h-12 bg-white/70 dark:bg-slate-800/70 border-0 backdrop-blur-sm"
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              className="h-12 bg-white/70 dark:bg-slate-800/70 border-0 backdrop-blur-sm"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          <div className="text-center space-y-3 text-sm">
            <a href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </a>
            <div>
              <span className="text-slate-600">New to FaceAttend? </span>
              <a href="/register" className="text-blue-600 font-semibold hover:underline">
                Get started
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ABTestLoginForm(props: LoginFormVariantProps) {
  return (
    <ABTestComponent
      experimentId="login_form_test"
      variants={{
        control: ControlLoginForm,
        variant_a: HorizontalLayoutVariant,
        variant_b: ModernGradientVariant
      }}
      defaultVariant="control"
      fallback={ControlLoginForm}
      componentProps={props}
      onVariantRender={(variant) => {
        console.log(`Login form variant rendered: ${variant}`);
      }}
    />
  );
}