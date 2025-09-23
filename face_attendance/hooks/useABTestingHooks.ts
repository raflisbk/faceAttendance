'use client';

import { useEffect, useCallback, useState } from 'react';
import { useVariant, useABTesting } from '@/contexts/ABTestingContext';

export function useExperimentVariant(experimentId: string, defaultVariant?: string) {
  return useVariant(experimentId, defaultVariant);
}

export function useTrackConversion(
  experimentId: string,
  conversionEvent: string = 'conversion'
) {
  const { trackEvent } = useVariant(experimentId);

  const trackConversion = useCallback((value?: any, metadata?: Record<string, any>) => {
    trackEvent(conversionEvent, value, {
      ...metadata,
      isConversion: true,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, conversionEvent]);

  return trackConversion;
}

export function usePageViewTracking(experimentId: string, pageName?: string) {
  const { trackEvent } = useVariant(experimentId);

  useEffect(() => {
    trackEvent('page_view', {
      page: pageName || window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pageName]);
}

export function useClickTracking(experimentId: string) {
  const { trackEvent } = useVariant(experimentId);

  const trackClick = useCallback((
    elementId: string,
    value?: any,
    metadata?: Record<string, any>
  ) => {
    trackEvent('click', value, {
      ...metadata,
      elementId,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return trackClick;
}

export function useFormTracking(experimentId: string) {
  const { trackEvent } = useVariant(experimentId);

  const trackFormStart = useCallback((formId: string) => {
    trackEvent('form_start', { formId, timestamp: new Date().toISOString() });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((
    formId: string,
    success: boolean = true,
    data?: any
  ) => {
    trackEvent('form_submit', {
      formId,
      success,
      data,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackFormError = useCallback((
    formId: string,
    error: string,
    field?: string
  ) => {
    trackEvent('form_error', {
      formId,
      error,
      field,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackFieldInteraction = useCallback((
    formId: string,
    fieldName: string,
    action: 'focus' | 'blur' | 'change'
  ) => {
    trackEvent('field_interaction', {
      formId,
      fieldName,
      action,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackFieldInteraction
  };
}

export function useTimeOnPage(experimentId: string) {
  const { trackEvent } = useVariant(experimentId);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    const trackTimeOnPage = () => {
      const timeSpent = Date.now() - startTime;
      trackEvent('time_on_page', {
        timeSpent,
        timeSpentSeconds: Math.round(timeSpent / 1000),
        timestamp: new Date().toISOString()
      });
    };

    const handleBeforeUnload = () => {
      trackTimeOnPage();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackTimeOnPage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackTimeOnPage();
    };
  }, [trackEvent, startTime]);

  return useCallback(() => {
    const timeSpent = Date.now() - startTime;
    return Math.round(timeSpent / 1000);
  }, [startTime]);
}

export function useScrollTracking(experimentId: string, thresholds: number[] = [25, 50, 75, 90]) {
  const { trackEvent } = useVariant(experimentId);
  const [trackedThresholds] = useState(() => new Set<number>());

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / scrollHeight) * 100;

      thresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
          trackedThresholds.add(threshold);
          trackEvent('scroll_depth', {
            threshold,
            scrollPercent: Math.round(scrollPercent),
            timestamp: new Date().toISOString()
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackEvent, thresholds, trackedThresholds]);
}

export function useFeatureFlag(
  experimentId: string,
  feature: string,
  defaultValue: boolean = false
) {
  const { getVariant } = useABTesting();
  const [isEnabled, setIsEnabled] = useState(defaultValue);

  useEffect(() => {
    const variant = getVariant(experimentId);
    if (variant) {
      fetch(`/api/ab-testing/feature-flag/${experimentId}/${variant}/${feature}`)
        .then(response => response.json())
        .then(data => setIsEnabled(data.enabled))
        .catch(() => setIsEnabled(defaultValue));
    }
  }, [experimentId, feature, defaultValue, getVariant]);

  return isEnabled;
}

export function useVariantData<T = any>(
  experimentId: string,
  dataKey: string,
  defaultValue?: T
): T | undefined {
  const { getVariant } = useABTesting();
  const [data, setData] = useState<T | undefined>(defaultValue);

  useEffect(() => {
    const variant = getVariant(experimentId);
    if (variant) {
      fetch(`/api/ab-testing/variant-data/${experimentId}/${variant}/${dataKey}`)
        .then(response => response.json())
        .then(responseData => setData(responseData.value))
        .catch(() => setData(defaultValue));
    }
  }, [experimentId, dataKey, defaultValue, getVariant]);

  return data;
}

export function usePerformanceTracking(experimentId: string) {
  const { trackEvent } = useVariant(experimentId);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navigationEntry = entry as PerformanceNavigationTiming;
            trackEvent('performance_navigation', {
              loadTime: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
              domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
              firstPaint: navigationEntry.loadEventEnd - navigationEntry.fetchStart,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });

      return () => observer.disconnect();
    }
  }, [trackEvent]);
}

export function useExperimentResults(experimentId: string) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ab-testing/results/${experimentId}`);
        if (!response.ok) throw new Error('Failed to fetch results');
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [experimentId]);

  return { results, loading, error };
}