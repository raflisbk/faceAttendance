import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const TrackEventSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  event: z.string(),
  value: z.any().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = TrackEventSchema.parse(body);

    console.log('A/B Test Event Tracked:', {
      experimentId: validatedData.experimentId,
      variantId: validatedData.variantId,
      event: validatedData.event,
      timestamp: validatedData.timestamp
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking A/B test event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 400 }
    );
  }
}