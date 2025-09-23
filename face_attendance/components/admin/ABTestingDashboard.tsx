'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useABTesting } from '@/contexts/ABTestingContext';
import { Experiment } from '@/lib/ab-testing';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Play,
  Pause,
  Square,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ExperimentWithResults extends Experiment {
  results?: {
    totalParticipants: number;
    variants: Record<string, {
      participants: number;
      conversions: number;
      conversionRate: number;
      events: Record<string, number>;
    }>;
    statisticalSignificance?: {
      isSignificant: boolean;
      confidence: number;
      pValue: number;
    };
  };
}

export function ABTestingDashboard() {
  const { experiments: activeExperiments } = useABTesting();
  const [experiments, setExperiments] = useState<ExperimentWithResults[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExperimentData = async () => {
      setLoading(true);
      try {
        const experimentsWithResults = await Promise.all(
          activeExperiments.map(async (experiment) => {
            try {
              const response = await fetch(`/api/ab-testing/results/${experiment.id}`);
              if (response.ok) {
                const results = await response.json();
                return { ...experiment, results };
              }
            } catch (error) {
              console.warn(`Failed to load results for ${experiment.id}:`, error);
            }
            return experiment;
          })
        );
        setExperiments(experimentsWithResults);
      } catch (error) {
        console.error('Failed to load experiment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExperimentData();
  }, [activeExperiments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <Square className="h-4 w-4" />;
      default: return null;
    }
  };

  const calculateConfidenceLevel = (results: any) => {
    if (!results?.statisticalSignificance) return 0;
    return results.statisticalSignificance.confidence;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your experiments</p>
        </div>
        <Button>
          Create New Experiment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Experiments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.filter(e => e.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.reduce((sum, exp) => sum + (exp.results?.totalParticipants || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Significant Results</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.filter(e => e.results?.statisticalSignificance?.isSignificant).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                experiments.reduce((sum, exp) => sum + calculateConfidenceLevel(exp.results), 0) /
                (experiments.length || 1)
              )}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Experiment Performance</CardTitle>
                <CardDescription>Conversion rates across active experiments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={experiments.map(exp => ({
                    name: exp.name,
                    control: exp.results?.variants?.control?.conversionRate * 100 || 0,
                    variant: exp.results?.variants?.variant_a?.conversionRate * 100 || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="control" fill="#3b82f6" name="Control" />
                    <Bar dataKey="variant" fill="#10b981" name="Variant A" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experiment Status Distribution</CardTitle>
                <CardDescription>Current status of all experiments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: experiments.filter(e => e.status === 'active').length },
                        { name: 'Paused', value: experiments.filter(e => e.status === 'paused').length },
                        { name: 'Completed', value: experiments.filter(e => e.status === 'completed').length },
                        { name: 'Draft', value: experiments.filter(e => e.status === 'draft').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <div className="grid gap-4">
            {experiments.map((experiment) => (
              <Card key={experiment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {experiment.name}
                        <Badge className={getStatusColor(experiment.status)}>
                          {getStatusIcon(experiment.status)}
                          {experiment.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{experiment.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        {experiment.status === 'active' ? 'Pause' : 'Start'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Participants</p>
                      <p className="text-2xl font-bold">
                        {experiment.results?.totalParticipants?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Variants</p>
                      <p className="text-2xl font-bold">{experiment.variants.length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={calculateConfidenceLevel(experiment.results)}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium">
                          {calculateConfidenceLevel(experiment.results)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {experiment.results?.statisticalSignificance && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {experiment.results.statisticalSignificance.isSignificant
                          ? `Statistical significance achieved! (p-value: ${experiment.results.statisticalSignificance.pValue})`
                          : `Not yet statistically significant (p-value: ${experiment.results.statisticalSignificance.pValue})`
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {selectedExperiment ? (
            <ExperimentResults
              experiment={experiments.find(e => e.id === selectedExperiment)!}
              onBack={() => setSelectedExperiment(null)}
            />
          ) : (
            <div className="grid gap-4">
              {experiments.map((experiment) => (
                <Card key={experiment.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6" onClick={() => setSelectedExperiment(experiment.id)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{experiment.name}</h3>
                        <p className="text-sm text-gray-600">{experiment.description}</p>
                      </div>
                      <Button variant="outline">View Results</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExperimentResults({
  experiment,
  onBack
}: {
  experiment: ExperimentWithResults;
  onBack: () => void;
}) {
  if (!experiment.results) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>No results available for this experiment.</p>
          <Button onClick={onBack} className="mt-4">Back to List</Button>
        </CardContent>
      </Card>
    );
  }

  const { results } = experiment;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{experiment.name} - Results</h2>
          <p className="text-gray-600">{experiment.description}</p>
        </div>
        <Button onClick={onBack} variant="outline">
          Back to List
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(results.variants).map(([variantId, data]) => (
          <Card key={variantId}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{variantId.replace('_', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="text-xl font-bold">{data.participants.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conversions</p>
                  <p className="text-xl font-bold">{data.conversions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-xl font-bold">{(data.conversionRate * 100).toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={Object.entries(results.variants).map(([variantId, data]) => ({
                variant: variantId.replace('_', ' '),
                ...data.events
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="variant" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="page_view" fill="#3b82f6" name="Page Views" />
              <Bar dataKey="click" fill="#10b981" name="Clicks" />
              <Bar dataKey="form_submit" fill="#f59e0b" name="Form Submits" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}