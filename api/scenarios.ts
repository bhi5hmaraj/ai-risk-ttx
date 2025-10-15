import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import type { SubmitScenarioRequest, SubmitScenarioResponse } from '../types/publicScenario.js';

const prisma = new PrismaClient();

/**
 * POST /api/scenarios
 * Submit a public scenario for moderation
 *
 * GET /api/scenarios
 * Fetch approved public scenarios (sorted by votes or date)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (req.method === 'POST') {
      return await handleSubmitScenario(req, res);
    } else if (req.method === 'GET') {
      return await handleGetScenarios(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in scenarios API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Handle POST request - Submit a scenario for moderation
 */
async function handleSubmitScenario(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as SubmitScenarioRequest;

  // Basic validation
  if (!body.scenarioData) {
    res.status(400).json({
      success: false,
      error: 'Missing scenarioData',
    } as SubmitScenarioResponse);
    return;
  }

  const { scenarioData, submitterName } = body;

  // Validate required fields in scenarioData
  if (!scenarioData.customPrompt || !scenarioData.gameSetup || !scenarioData.initialEvent) {
    res.status(400).json({
      success: false,
      error: 'Invalid scenarioData: missing required fields',
    } as SubmitScenarioResponse);
    return;
  }

  try {
    // Create the scenario in pending status
    const scenario = await prisma.publicScenario.create({
      data: {
        customPrompt: scenarioData.customPrompt,
        gameSetup: scenarioData.gameSetup as any, // Prisma Json type
        initialEvent: scenarioData.initialEvent as any, // Prisma Json type
        submitterName: submitterName || null,
        status: 'pending',
      },
    });

    res.status(201).json({
      success: true,
      id: scenario.id,
    } as SubmitScenarioResponse);
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit scenario',
    } as SubmitScenarioResponse);
  }
}

/**
 * Handle GET request - Fetch approved scenarios
 * Query params:
 *   - sortBy: 'votes' | 'date' (default: 'votes')
 *   - limit: number (default: 20, max: 100)
 */
async function handleGetScenarios(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const sortBy = (req.query.sortBy as string) || 'votes';
  const limitParam = parseInt(req.query.limit as string) || 20;
  const limit = Math.min(limitParam, 100); // Cap at 100

  try {
    const scenarios = await prisma.publicScenario.findMany({
      where: {
        status: 'approved',
      },
      orderBy: sortBy === 'date'
        ? { createdAt: 'desc' }
        : { voteCount: 'desc' },
      take: limit,
      select: {
        id: true,
        customPrompt: true,
        gameSetup: true,
        initialEvent: true,
        submitterName: true,
        voteCount: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      scenarios,
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scenarios',
    });
  }
}
