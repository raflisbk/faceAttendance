import { NextRequest, NextResponse } from 'next/server';

const assignmentStore = new Map<string, { variantId: string; assignedAt: string }>();

export async function GET(
  request: NextRequest,
  { params }: { params: { experimentId: string; userId: string } }
) {
  try {
    const { experimentId, userId } = params;
    const key = `${experimentId}:${userId}`;
    const assignment = assignmentStore.get(key);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      variantId: assignment.variantId,
      assignedAt: assignment.assignedAt
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}