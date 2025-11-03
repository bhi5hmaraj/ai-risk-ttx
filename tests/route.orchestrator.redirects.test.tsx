/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { RouteOrchestrator } from '../components/RouteOrchestrator';
import { GamePhase } from '../types';

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

vi.mock('next/navigation', async () => ({
  useRouter: () => ({ push, replace, back }),
  usePathname: () => '/',
}));

const mockController: any = {
  state: {
    gameState: { phase: GamePhase.LOBBY, round: 0, coreMetric: { name: 'Trust', description: 'd', value: 100 }, eventLog: [], currentEvent: null },
    players: [],
  },
};

vi.mock('../hooks/useGameController', () => ({
  useGameController: () => mockController,
}));

// Stub the session store for hasStartIntent/sessionMeta
vi.mock('../stores/sessionStore', () => ({
  useSessionStore: () => ({ hasStartIntent: false, sessionMeta: null }),
}));

describe('RouteOrchestrator', () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
  });

  it('does not redirect to /game when only hasStartIntent is false', () => {
    render(<RouteOrchestrator />);
    expect(replace).not.toHaveBeenCalled();
  });
});

