import { z } from 'zod';

export const ExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    allocation: z.number().min(0).max(100),
    config: z.record(z.any())
  })),
  targetAudience: z.object({
    userTypes: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    percentage: z.number().min(0).max(100).default(100)
  }).optional(),
  conversionGoals: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['page_view', 'click', 'form_submit', 'custom']),
    value: z.string()
  })),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const ExperimentResultSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  event: z.string(),
  value: z.any().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export type Experiment = z.infer<typeof ExperimentSchema>;
export type ExperimentVariant = Experiment['variants'][0];
export type ExperimentResult = z.infer<typeof ExperimentResultSchema>;

export interface ABTestingConfig {
  experiments: Experiment[];
  enabled: boolean;
  cookiePrefix: string;
  sessionTimeout: number;
}

export class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map();
  private config: ABTestingConfig;

  constructor(config: ABTestingConfig) {
    this.config = config;
    this.loadExperiments();
  }

  private loadExperiments() {
    this.config.experiments.forEach(experiment => {
      this.experiments.set(experiment.id, experiment);
    });
  }

  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  getAllActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values())
      .filter(exp => exp.status === 'active')
      .filter(exp => {
        const now = new Date();
        if (exp.startDate && exp.startDate > now) return false;
        if (exp.endDate && exp.endDate < now) return false;
        return true;
      });
  }

  assignUserToVariant(
    experimentId: string,
    userId: string,
    userContext?: {
      userType?: string;
      location?: string;
      metadata?: Record<string, any>;
    }
  ): string | null {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return null;
    }

    if (!this.isUserEligible(experiment, userContext)) {
      return null;
    }

    const existingAssignment = this.getUserAssignment(experimentId, userId);
    if (existingAssignment) {
      return existingAssignment;
    }

    const variant = this.selectVariant(experiment, userId);
    this.setUserAssignment(experimentId, userId, variant.id);

    return variant.id;
  }

  private isUserEligible(
    experiment: Experiment,
    userContext?: { userType?: string; location?: string; metadata?: Record<string, any> }
  ): boolean {
    if (!experiment.targetAudience) return true;

    const { userTypes, locations, percentage } = experiment.targetAudience;

    if (userTypes && userTypes.length > 0 && userContext?.userType) {
      if (!userTypes.includes(userContext.userType)) return false;
    }

    if (locations && locations.length > 0 && userContext?.location) {
      if (!locations.includes(userContext.location)) return false;
    }

    if (percentage < 100) {
      const hash = this.hashString(`${experiment.id}-${userContext?.metadata?.sessionId || 'anonymous'}`);
      if ((hash % 100) >= percentage) return false;
    }

    return true;
  }

  private selectVariant(experiment: Experiment, userId: string): ExperimentVariant {
    const hash = this.hashString(`${experiment.id}-${userId}`);
    const random = hash % 100;

    let cumulativeAllocation = 0;
    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation;
      if (random < cumulativeAllocation) {
        return variant;
      }
    }

    return experiment.variants[experiment.variants.length - 1];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getUserAssignment(experimentId: string, userId: string): string | null {
    const userExperiments = this.userAssignments.get(userId);
    return userExperiments?.get(experimentId) || null;
  }

  private setUserAssignment(experimentId: string, userId: string, variantId: string): void {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(experimentId, variantId);
  }

  updateExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  removeExperiment(experimentId: string): void {
    this.experiments.delete(experimentId);
  }

  getVariantConfig<T = any>(experimentId: string, variantId: string): T | null {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find(v => v.id === variantId);
    return variant?.config as T || null;
  }
}

export const DEFAULT_AB_CONFIG: ABTestingConfig = {
  experiments: [],
  enabled: true,
  cookiePrefix: 'ab_test_',
  sessionTimeout: 30 * 24 * 60 * 60 * 1000 // 30 days
};