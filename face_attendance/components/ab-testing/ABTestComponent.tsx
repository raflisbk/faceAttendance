'use client';

import React from 'react';
import { useVariant } from '@/contexts/ABTestingContext';

interface ABTestComponentProps {
  experimentId: string;
  variants: Record<string, React.ComponentType<any>>;
  defaultVariant?: string;
  fallback?: React.ComponentType<any>;
  componentProps?: any;
  onVariantRender?: (variant: string) => void;
}

export function ABTestComponent({
  experimentId,
  variants,
  defaultVariant,
  fallback: FallbackComponent,
  componentProps = {},
  onVariantRender
}: ABTestComponentProps) {
  const { variant, isLoading, trackEvent } = useVariant(experimentId, defaultVariant);

  React.useEffect(() => {
    if (variant && onVariantRender) {
      onVariantRender(variant);
    }
  }, [variant, onVariantRender]);

  if (isLoading) {
    if (FallbackComponent) {
      return <FallbackComponent {...componentProps} />;
    }
    return null;
  }

  const VariantComponent = variant && variants[variant] ? variants[variant] : null;

  if (!VariantComponent) {
    if (FallbackComponent) {
      return <FallbackComponent {...componentProps} />;
    }
    return null;
  }

  return (
    <VariantComponent
      {...componentProps}
      trackEvent={trackEvent}
      variant={variant}
    />
  );
}

interface ABTestWrapperProps {
  experimentId: string;
  variantId: string;
  children: React.ReactNode;
  trackOnMount?: boolean;
  trackOnUnmount?: boolean;
  className?: string;
}

export function ABTestWrapper({
  experimentId,
  variantId,
  children,
  trackOnMount = false,
  trackOnUnmount = false,
  className
}: ABTestWrapperProps) {
  const { trackEvent } = useVariant(experimentId);

  React.useEffect(() => {
    if (trackOnMount) {
      trackEvent('component_mounted', { variantId });
    }

    return () => {
      if (trackOnUnmount) {
        trackEvent('component_unmounted', { variantId });
      }
    };
  }, [trackEvent, variantId, trackOnMount, trackOnUnmount]);

  return (
    <div className={className} data-ab-experiment={experimentId} data-ab-variant={variantId}>
      {children}
    </div>
  );
}

interface ConditionalRenderProps {
  experimentId: string;
  variantIds: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  experimentId,
  variantIds,
  children,
  fallback = null
}: ConditionalRenderProps) {
  const { variant } = useVariant(experimentId);

  if (!variant || !variantIds.includes(variant)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface VariantSwitchProps {
  experimentId: string;
  children: React.ReactNode;
  defaultVariant?: string;
}

export function VariantSwitch({ experimentId, children, defaultVariant }: VariantSwitchProps) {
  const { variant } = useVariant(experimentId, defaultVariant);

  const childrenArray = React.Children.toArray(children);

  for (const child of childrenArray) {
    if (React.isValidElement(child) && child.type === VariantCase) {
      const variantIds = Array.isArray(child.props.variantId)
        ? child.props.variantId
        : [child.props.variantId];

      if (variant && variantIds.includes(variant)) {
        return child;
      }
    }
  }

  const defaultChild = childrenArray.find(child =>
    React.isValidElement(child) && child.type === VariantCase && child.props.isDefault
  );

  return defaultChild || null;
}

interface VariantCaseProps {
  variantId: string | string[];
  isDefault?: boolean;
  children: React.ReactNode;
}

export function VariantCase({ children }: VariantCaseProps) {
  return <>{children}</>;
}

export function withABTest<P extends object>(
  Component: React.ComponentType<P>,
  experimentId: string,
  variantId: string
) {
  const ABTestWrappedComponent = (props: P) => {
    const { trackEvent } = useVariant(experimentId);

    const enhancedProps = {
      ...props,
      trackEvent: (event: string, value?: any, metadata?: Record<string, any>) =>
        trackEvent(event, value, { ...metadata, variantId })
    } as P & { trackEvent: (event: string, value?: any, metadata?: Record<string, any>) => void };

    return <Component {...enhancedProps} />;
  };

  ABTestWrappedComponent.displayName = `withABTest(${Component.displayName || Component.name})`;
  return ABTestWrappedComponent;
}