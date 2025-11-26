/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LobbyScreen } from '../screens/LobbyScreen';
import { ROLES } from '../constants';
import { AI_SAFETY_SCENARIO, ELECTION_PRESET_ABOUT } from '../presets';

const noop = () => {};

function renderLobby(partial: Partial<React.ComponentProps<typeof LobbyScreen>>) {
  const props: React.ComponentProps<typeof LobbyScreen> = {
    selectedRoleName: null,
    setSelectedRoleName: vi.fn(),
    gamePath: null,
    setGamePath: vi.fn(),
    customScenario: '',
    setCustomScenario: vi.fn(),
    gameSetup: null,
    setGameSetup: vi.fn(),
    isLoading: false,
    handleCustomGameStart: vi.fn(),
    handleStartGame: vi.fn(),
    ...partial,
  } as any;
  return render(<LobbyScreen {...props} />);
}

describe('LobbyScreen preset intros', () => {
  it('renders AI Safety scenario intro when gamePath=ai_safety', () => {
    renderLobby({ gamePath: 'ai_safety' });
    expect(screen.getByText(AI_SAFETY_SCENARIO.scenarioTitle)).toBeTruthy();
    // Use a distinctive word from the description
    expect(screen.getByText(/blackouts/i)).toBeTruthy();
  });

  it('renders Classic (election) scenario intro when gamePath=classic', () => {
    renderLobby({ gamePath: 'classic' });
    expect(screen.getByText(ELECTION_PRESET_ABOUT.scenarioTitle)).toBeTruthy();
    expect(screen.getByText(/election crisis/i)).toBeTruthy();
  });
});
