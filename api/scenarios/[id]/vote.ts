import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../server/lib/prisma.js';

/**
 * POST /api/scenarios/:id/vote
 * Upvote a scenario (idempotent based on userFingerprint)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const scenarioId = req.query.id as string;
    const { userFingerprint } = req.body;

    if (!scenarioId) {
      return res.status(400).json({ error: 'Missing scenario ID' });
    }

    if (!userFingerprint) {
      return res.status(400).json({ error: 'Missing userFingerprint' });
    }

    // Check if scenario exists and is approved
    const scenario = await prisma.publicScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, status: true },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    if (scenario.status !== 'approved') {
      return res.status(403).json({ error: 'Scenario is not approved' });
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
      return res.status(200).json({
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

    return res.status(200).json({
      success: true,
      message: 'Vote recorded',
      alreadyVoted: false,
    });
  } catch (error) {
    console.error('Error voting on scenario:', error);
    return res.status(500).json({
      error: 'Failed to record vote',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
