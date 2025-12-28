/**
 * Budget Plan Export API Route
 * Returns budget plan data in JSON format for client-side PDF generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db/supabase';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    if (!session || !session.budgetPlan) {
      return NextResponse.json(
        { error: 'Budget plan not found' },
        { status: 404 }
      );
    }

    const { budgetPlan, selectedCar, finances } = session;

    // Return structured data for client-side PDF generation
    return NextResponse.json({
      success: true,
      data: {
        budgetPlan,
        selectedCar,
        finances,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export budget plan' },
      { status: 500 }
    );
  }
}
