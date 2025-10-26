import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';
import type { SubmitScenarioRequest, SubmitScenarioResponse } from './types/publicScenario';

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
  }
}

/**
 * Handle POST request - Submit a scenario for moderation
 */
async function handleSubmitScenario(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[POST /api/scenarios] Request received');
  console.log('[POST /api/scenarios] Body:', JSON.stringify(req.body, null, 2));

  const body = req.body as SubmitScenarioRequest;

  // Basic validation
  if (!body.scenarioData) {
    console.error('[POST /api/scenarios] Validation failed: Missing scenarioData');
    res.status(400).json({
      success: false,
      error: 'Missing scenarioData',
    } as SubmitScenarioResponse);
    return;
  }

  const { scenarioData, submitterName } = body;
  console.log('[POST /api/scenarios] Submitter name:', submitterName || 'anonymous');

  // Validate required fields in scenarioData
  if (!scenarioData.customPrompt || !scenarioData.gameSetup || !scenarioData.initialEvent) {
    console.error('[POST /api/scenarios] Validation failed: Missing required fields in scenarioData');
    console.error('[POST /api/scenarios] Has customPrompt:', !!scenarioData.customPrompt);
    console.error('[POST /api/scenarios] Has gameSetup:', !!scenarioData.gameSetup);
    console.error('[POST /api/scenarios] Has initialEvent:', !!scenarioData.initialEvent);
    res.status(400).json({
      success: false,
      error: 'Invalid scenarioData: missing required fields',
    } as SubmitScenarioResponse);
    return;
  }

  try {
    console.log('[POST /api/scenarios] Creating scenario in database...');

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

    console.log('[POST /api/scenarios] Scenario created successfully. ID:', scenario.id);

    res.status(201).json({
      success: true,
      id: scenario.id,
    } as SubmitScenarioResponse);
  } catch (error) {
    console.error('[POST /api/scenarios] Database error:', error);
    console.error('[POST /api/scenarios] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
  console.log('[GET /api/scenarios] Request received');

  const sortBy = (req.query.sortBy as string) || 'votes';
  const limitParam = parseInt(req.query.limit as string) || 20;
  const limit = Math.min(limitParam, 100); // Cap at 100

  console.log('[GET /api/scenarios] Query params:', { sortBy, limit });

  try {
    // First, check total count of all scenarios (for debugging)
    const totalCount = await prisma.publicScenario.count();
    const approvedCount = await prisma.publicScenario.count({
      where: { status: 'approved' },
    });
    const pendingCount = await prisma.publicScenario.count({
      where: { status: 'pending' },
    });

    console.log('[GET /api/scenarios] Database stats:', {
      totalCount,
      approvedCount,
      pendingCount,
    });

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

    console.log('[GET /api/scenarios] Found scenarios:', scenarios.length);

    res.status(200).json({
      success: true,
      scenarios,
      debug: {
        totalCount,
        approvedCount,
        pendingCount,
      },
    });
  } catch (error) {
    console.error('[GET /api/scenarios] Error fetching scenarios:', error);
    console.error('[GET /api/scenarios] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scenarios',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
