import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/lib/prisma';
import { requireDBEnv } from '@/server/lib/env';
import path from 'path';
import fs from 'fs/promises';
import { AI_SAFETY_SCENARIO } from '@/presets';

export const runtime = 'nodejs';

type CatalogItem = {
  id: string;
  source: 'official' | 'contributed';
  gameSetup: any;
  initialEvent: { headline: string; detail: string };
  submitterName?: string | null;
  voteCount?: number;
  createdAt?: string;
};

async function loadOfficial(): Promise<CatalogItem[]> {
  try {
    const file = path.join(process.cwd(), 'server', 'data', 'official-scenarios.json');
    const raw = await fs.readFile(file, 'utf8');
    const arr = JSON.parse(raw) as any[];
    return arr.map((s) => ({
      id: s.id,
      source: 'official',
      gameSetup: s.gameSetup,
      initialEvent: s.initialEvent,
      createdAt: s.createdAt,
    }));
  } catch (err) {
    // Fallback: include AI Safety preset as at least one official scenario if file missing
    return [
      {
        id: 'official:ai_safety',
        source: 'official',
        gameSetup: AI_SAFETY_SCENARIO,
        initialEvent: {
          headline: AI_SAFETY_SCENARIO.scenarioTitle,
          detail: AI_SAFETY_SCENARIO.scenarioDescription,
        },
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

async function loadContributed(limit = 50, sortBy: 'votes'|'date' = 'votes'): Promise<CatalogItem[]> {
  const envError = requireDBEnv();
  if (envError) return [];
  const db = getPrisma();
  if (!db) return [];
  const scenarios = await db.publicScenario.findMany({
    where: { status: 'approved' },
    orderBy: sortBy === 'date' ? { createdAt: 'desc' } : { voteCount: 'desc' },
    take: Math.min(limit, 100),
    select: { id: true, gameSetup: true, initialEvent: true, submitterName: true, voteCount: true, createdAt: true },
  });
  return scenarios.map((s: any) => ({
    id: String(s.id),
    source: 'contributed',
    gameSetup: s.gameSetup,
    initialEvent: s.initialEvent,
    submitterName: s.submitterName,
    voteCount: s.voteCount ?? 0,
    createdAt: s.createdAt?.toISOString?.() || String(s.createdAt || ''),
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sortBy = (searchParams.get('sortBy') || 'votes') as 'votes'|'date';
  const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
  try {
    const [official, contributed] = await Promise.all([
      loadOfficial(),
      loadContributed(limit, sortBy),
    ]);
    return NextResponse.json({ success: true, scenarios: [...official, ...contributed] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to load scenarios' }, { status: 500 });
  }
}

