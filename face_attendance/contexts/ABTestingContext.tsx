'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExperimentManager, Experiment, DEFAULT_AB_CONFIG } from '@/lib/ab-testing';
import { ABTestingStorage, LocalStorageABTesting, CookieABTesting, DatabaseABTesting } from '@/lib/ab-testing-storage';

interface ABTestingContextType {
  getVariant: (experimentId: string, defaultVariant?: string) => string | null;
  trackEvent: (experimentId: string, event: string, value?: any, metadata?: Record<string, any>) => void;
  isLoading: boolean;
  experiments: Experiment[];
  userAssignments: Record<string, string>;
}

const ABTestingContext = createContext<ABTestingContextType | undefined>(undefined);

interface ABTestingProviderProps {
  children: React.ReactNode;
  storageType?: 'localStorage' | 'cookie' | 'database';
  experiments?: Experiment[];
  userId?: string;
  userContext?: {
    userType?: string;
    location?: string;
    metadata?: Record<string, any>;
  };
  enabled?: boolean;
}

export function ABTestingProvider({
  children,
  storageType = 'localStorage',
  experiments = [],
  userId,
  userContext,
  enabled = true
}: ABTestingProviderProps) {
  const [experimentManager, setExperimentManager] = useState<ExperimentManager | null>(null);
  const [storage, setStorage] = useState<ABTestingStorage | null>(null);
  const [userAssignments, setUserAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2));

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const initializeABTesting = async () => {
      try {
        let storageInstance: ABTestingStorage;

        switch (storageType) {
          case 'cookie':
            storageInstance = new CookieABTesting();
            break;
          case 'database':
            storageInstance = new DatabaseABTesting();
            break;
          default:
            storageInstance = new LocalStorageABTesting();
        }

        setStorage(storageInstance);

        const config = {
          ...DEFAULT_AB_CONFIG,
          experiments,
          enabled
        };

        const manager = new ExperimentManager(config);
        setExperimentManager(manager);

        const currentUserId = userId || `anonymous_${sessionId}`;
        const assignments: Record<string, string> = {};

        for (const experiment of manager.getAllActiveExperiments()) {
          try {
            const existingAssignment = await storageInstance.getUserAssignment(experiment.id, currentUserId);

            if (existingAssignment) {
              assignments[experiment.id] = existingAssignment;
            } else {
              const newAssignment = manager.assignUserToVariant(
                experiment.id,
                currentUserId,
                userContext
              );

              if (newAssignment) {
                assignments[experiment.id] = newAssignment;
                await storageInstance.setUserAssignment(experiment.id, currentUserId, newAssignment);
              }
            }
          } catch (error) {
            console.warn(`Failed to process experiment ${experiment.id}:`, error);
          }
        }

        setUserAssignments(assignments);
      } catch (error) {
        console.error('Failed to initialize A/B testing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeABTesting();
  }, [storageType, experiments, userId, userContext, enabled, sessionId]);

  const getVariant = (experimentId: string, defaultVariant?: string): string | null => {
    if (!enabled || !experimentManager) {
      return defaultVariant || null;
    }

    const assignment = userAssignments[experimentId];
    if (assignment) {
      return assignment;
    }

    return defaultVariant || null;
  };

  const trackEvent = async (
    experimentId: string,
    event: string,
    value?: any,
    metadata?: Record<string, any>
  ) => {
    if (!enabled || !storage || !experimentManager) return;

    const variantId = userAssignments[experimentId];
    if (!variantId) return;

    const currentUserId = userId || `anonymous_${sessionId}`;

    try {
      await storage.trackEvent({
        experimentId,
        variantId,
        userId: currentUserId,
        sessionId,
        event,
        value,
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          timestamp: new Date().toISOString(),
          ...userContext
        }
      });
    } catch (error) {
      console.warn('Failed to track A/B testing event:', error);
    }
  };

  const contextValue: ABTestingContextType = {
    getVariant,
    trackEvent,
    isLoading,
    experiments: experimentManager?.getAllActiveExperiments() || [],
    userAssignments
  };

  return (
    <ABTestingContext.Provider value={contextValue}>
      {children}
    </ABTestingContext.Provider>
  );
}

export function useABTesting() {
  const context = useContext(ABTestingContext);
  if (context === undefined) {
    throw new Error('useABTesting must be used within an ABTestingProvider');
  }
  return context;
}

export function useVariant(experimentId: string, defaultVariant?: string) {
  const { getVariant, trackEvent, isLoading } = useABTesting();
  const variant = getVariant(experimentId, defaultVariant);

  useEffect(() => {
    if (!isLoading && variant) {
      trackEvent(experimentId, 'variant_assigned', { variant });
    }
  }, [experimentId, variant, trackEvent, isLoading]);

  return {
    variant,
    isLoading,
    trackEvent: (event: string, value?: any, metadata?: Record<string, any>) =>
      trackEvent(experimentId, event, value, metadata)
  };
}

export function useExperimentConfig<T = any>(experimentId: string, variantId?: string): T | null {
  const { getVariant } = useABTesting();
  const [config, setConfig] = useState<T | null>(null);

  useEffect(() => {
    const currentVariant = variantId || getVariant(experimentId);
    if (currentVariant && typeof window !== 'undefined') {
      fetch(`/api/ab-testing/config/${experimentId}/${currentVariant}`)
        .then(response => response.json())
        .then(data => setConfig(data))
        .catch(error => console.warn('Failed to fetch experiment config:', error));
    }
  }, [experimentId, variantId, getVariant]);

  return config;
}