import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params;

    const mockResults = {
      experimentId,
      totalParticipants: 1000,
      variants: {
        control: {
          participants: 500,
          conversions: 25,
          conversionRate: 0.05,
          events: {
            page_view: 500,
            click: 125,
            form_submit: 25
          }
        },
        variant_a: {
          participants: 500,
          conversions: 35,
          conversionRate: 0.07,
          events: {
            page_view: 500,
            click: 180,
            form_submit: 35
          }
        }
      },
      statisticalSignificance: {
        isSignificant: true,
        confidence: 95,
        pValue: 0.032
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(mockResults);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}