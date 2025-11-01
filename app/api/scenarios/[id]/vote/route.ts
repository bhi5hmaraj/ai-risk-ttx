import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/lib/prisma';

/**
 * POST /api/scenarios/:id/vote
 * Upvote a scenario (idempotent based on userFingerprint)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    const body = await req.json();
    const { userFingerprint } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Missing scenario ID' },
        { status: 400 }
      );
    }

    if (!userFingerprint) {
      return NextResponse.json(
        { error: 'Missing userFingerprint' },
        { status: 400 }
      );
    }

    // Check if scenario exists and is approved
    const scenario = await prisma.publicScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, status: true },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (scenario.status !== 'approved') {
      return NextResponse.json(
        { error: 'Scenario is not approved' },
        { status: 403 }
      );
    }

    // Check if user already voted
    const existingVote = await prisma.scenarioVote.findUnique({
      where: {
        scenarioId_userFingerprint: {
          scenarioId,
          userFingerprint,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json({
        success: true,
        message: 'Already voted',
        alreadyVoted: true,
      });
    }

    // Create vote and increment voteCount in a transaction
    await prisma.$transaction([
      prisma.scenarioVote.create({
        data: {
          scenarioId,
          userFingerprint,
        },
      }),
      prisma.publicScenario.update({
        where: { id: scenarioId },
        data: {
          voteCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Vote recorded',
      alreadyVoted: false,
    });
  } catch (error) {
    console.error('Error voting on scenario:', error);
    return NextResponse.json(
      {
        error: 'Failed to record vote',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
