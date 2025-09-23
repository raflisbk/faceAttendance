export interface ABTestingStorage {
  getUserAssignment(experimentId: string, userId: string): Promise<string | null>;
  setUserAssignment(experimentId: string, userId: string, variantId: string): Promise<void>;
  trackEvent(event: {
    experimentId: string;
    variantId: string;
    userId?: string;
    sessionId: string;
    event: string;
    value?: any;
    metadata?: Record<string, any>;
  }): Promise<void>;
  getExperimentResults(experimentId: string): Promise<any>;
}

export class LocalStorageABTesting implements ABTestingStorage {
  private readonly PREFIX = 'ab_test_';

  async getUserAssignment(experimentId: string, userId: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const key = `${this.PREFIX}${experimentId}_${userId}`;
    const assignment = localStorage.getItem(key);

    if (assignment) {
      const parsed = JSON.parse(assignment);
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.variantId;
    }

    return null;
  }

  async setUserAssignment(experimentId: string, userId: string, variantId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const key = `${this.PREFIX}${experimentId}_${userId}`;
    const assignment = {
      variantId,
      assignedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    localStorage.setItem(key, JSON.stringify(assignment));
  }

  async trackEvent(event: {
    experimentId: string;
    variantId: string;
    userId?: string;
    sessionId: string;
    event: string;
    value?: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (typeof window === 'undefined') return;

    const eventsKey = `${this.PREFIX}events`;
    const existingEvents = localStorage.getItem(eventsKey);
    const events = existingEvents ? JSON.parse(existingEvents) : [];

    events.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    localStorage.setItem(eventsKey, JSON.stringify(events));
  }

  async getExperimentResults(experimentId: string): Promise<any> {
    if (typeof window === 'undefined') return null;

    const eventsKey = `${this.PREFIX}events`;
    const existingEvents = localStorage.getItem(eventsKey);
    const events = existingEvents ? JSON.parse(existingEvents) : [];

    return events.filter((event: any) => event.experimentId === experimentId);
  }
}

export class CookieABTesting implements ABTestingStorage {
  private readonly PREFIX = 'ab_test_';

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number = 30): void {
    if (typeof document === 'undefined') return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  async getUserAssignment(experimentId: string, userId: string): Promise<string | null> {
    const cookieName = `${this.PREFIX}${experimentId}_${userId}`;
    const assignment = this.getCookie(cookieName);
    return assignment ? JSON.parse(decodeURIComponent(assignment)).variantId : null;
  }

  async setUserAssignment(experimentId: string, userId: string, variantId: string): Promise<void> {
    const cookieName = `${this.PREFIX}${experimentId}_${userId}`;
    const assignment = {
      variantId,
      assignedAt: new Date().toISOString()
    };
    this.setCookie(cookieName, encodeURIComponent(JSON.stringify(assignment)));
  }

  async trackEvent(event: {
    experimentId: string;
    variantId: string;
    userId?: string;
    sessionId: string;
    event: string;
    value?: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/ab-testing/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to track A/B testing event:', error);
    }
  }

  async getExperimentResults(experimentId: string): Promise<any> {
    try {
      const response = await fetch(`/api/ab-testing/results/${experimentId}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to get experiment results:', error);
      return null;
    }
  }
}

export class DatabaseABTesting implements ABTestingStorage {
  async getUserAssignment(experimentId: string, userId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/ab-testing/assignment/${experimentId}/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.variantId;
      }
    } catch (error) {
      console.warn('Failed to get user assignment from database:', error);
    }
    return null;
  }

  async setUserAssignment(experimentId: string, userId: string, variantId: string): Promise<void> {
    try {
      await fetch('/api/ab-testing/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experimentId,
          userId,
          variantId,
          assignedAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to set user assignment in database:', error);
    }
  }

  async trackEvent(event: {
    experimentId: string;
    variantId: string;
    userId?: string;
    sessionId: string;
    event: string;
    value?: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await fetch('/api/ab-testing/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to track A/B testing event:', error);
    }
  }

  async getExperimentResults(experimentId: string): Promise<any> {
    try {
      const response = await fetch(`/api/ab-testing/results/${experimentId}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to get experiment results:', error);
      return null;
    }
  }
}