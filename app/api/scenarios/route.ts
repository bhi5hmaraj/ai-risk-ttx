import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/lib/prisma';
import type { SubmitScenarioRequest, SubmitScenarioResponse } from '@/types/publicScenario';
import { requireDBEnv } from '@/server/lib/env';

/**
 * POST /api/scenarios
 * Submit a public scenario for moderation
 */
export async function POST(req: NextRequest) {
  console.log('[POST /api/scenarios] Request received');

  try {
    const envError = requireDBEnv();
    if (envError) return envError;
    const body = await req.json() as SubmitScenarioRequest;
    console.log('[POST /api/scenarios] Body:', JSON.stringify(body, null, 2));

    // Basic validation
    if (!body.scenarioData) {
      console.error('[POST /api/scenarios] Validation failed: Missing scenarioData');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing scenarioData',
        } as SubmitScenarioResponse,
        { status: 400 }
      );
    }

    const { scenarioData, submitterName } = body;
    console.log('[POST /api/scenarios] Submitter name:', submitterName || 'anonymous');

    // Validate required fields in scenarioData
    if (!scenarioData.customPrompt || !scenarioData.gameSetup || !scenarioData.initialEvent) {
      console.error('[POST /api/scenarios] Validation failed: Missing required fields in scenarioData');
      console.error('[POST /api/scenarios] Has customPrompt:', !!scenarioData.customPrompt);
      console.error('[POST /api/scenarios] Has gameSetup:', !!scenarioData.gameSetup);
      console.error('[POST /api/scenarios] Has initialEvent:', !!scenarioData.initialEvent);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scenarioData: missing required fields',
        } as SubmitScenarioResponse,
        { status: 400 }
      );
    }

    console.log('[POST /api/scenarios] Creating scenario in database...');

    const db = getPrisma();
    if (!db) {
      console.warn('[POST /api/scenarios] Prisma unavailable. Returning 503.');
      return NextResponse.json(
        { success: false, error: 'Database unavailable' } as SubmitScenarioResponse,
        { status: 503 }
      );
    }

    // Create the scenario in pending status
    const scenario = await db.publicScenario.create({
      data: {
        customPrompt: scenarioData.customPrompt,
        gameSetup: scenarioData.gameSetup as any, // Prisma Json type
        initialEvent: scenarioData.initialEvent as any, // Prisma Json type
        submitterName: submitterName || null,
        status: 'pending',
      },
    });

    console.log('[POST /api/scenarios] Scenario created successfully. ID:', scenario.id);

    return NextResponse.json(
      {
        success: true,
        id: scenario.id,
      } as SubmitScenarioResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/scenarios] Error:', error);
    console.error('[POST /api/scenarios] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit scenario',
      } as SubmitScenarioResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/scenarios
 * Fetch approved public scenarios (sorted by votes or date)
 * Query params:
 *   - sortBy: 'votes' | 'date' (default: 'votes')
 *   - limit: number (default: 20, max: 100)
 */
export async function GET(req: NextRequest) {
  console.log('[GET /api/scenarios] Request received');

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get('sortBy') || 'votes';
  const limitParam = parseInt(searchParams.get('limit') || '20');
  const limit = Math.min(limitParam, 100); // Cap at 100

  console.log('[GET /api/scenarios] Query params:', { sortBy, limit });

  try {
    const envError = requireDBEnv();
    if (envError) return envError;
    const db = getPrisma();
    if (!db) {
      console.warn('[GET /api/scenarios] Prisma unavailable. Returning empty list.');
      return NextResponse.json({
        success: true,
        scenarios: [],
        debug: { totalCount: 0, approvedCount: 0, pendingCount: 0 },
      });
    }

    // First, check total count of all scenarios (for debugging)
    const totalCount = await db.publicScenario.count();
    const approvedCount = await db.publicScenario.count({
      where: { status: 'approved' },
    });
    const pendingCount = await db.publicScenario.count({
      where: { status: 'pending' },
    });

    console.log('[GET /api/scenarios] Database stats:', {
      totalCount,
      approvedCount,
      pendingCount,
    });

    const scenarios = await db.publicScenario.findMany({
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

    return NextResponse.json({
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scenarios',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
