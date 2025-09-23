import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const AssignmentSchema = z.object({
  experimentId: z.string(),
  userId: z.string(),
  variantId: z.string(),
  assignedAt: z.string()
});

const assignmentStore = new Map<string, { variantId: string; assignedAt: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AssignmentSchema.parse(body);

    const key = `${validatedData.experimentId}:${validatedData.userId}`;
    assignmentStore.set(key, {
      variantId: validatedData.variantId,
      assignedAt: validatedData.assignedAt
    });

    console.log('A/B Test Assignment Created:', {
      experimentId: validatedData.experimentId,
      userId: validatedData.userId,
      variantId: validatedData.variantId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 400 }
    );
  }
}