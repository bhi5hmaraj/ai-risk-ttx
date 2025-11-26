/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameScreen } from '../screens/GameScreen';
import { mockGameState, mockPlayer, mockActionOptions } from './fixtures/game-data';

describe('GameScreen layout', () => {
  it('renders Event Log below ActionSelection', () => {
    const human = { ...mockPlayer, id: 'human', isHuman: true } as any;
    const ai = { ...mockPlayer, id: 'ai1', isHuman: false } as any;

    render(
      <GameScreen
        gameState={mockGameState}
        players={[human, ai]}
        humanPlayer={human}
        timer={60}
        isPaused={false}
        isLoading={false}
        actionOptions={mockActionOptions as any}
        aiCompletionStatus={{}}
        isHistoryOpen={true}
        expandedRound={null}
        latestLogEntry={null}
        canViewActionTree={false}
        onToggleHistory={() => {}}
        onOpenActionTree={() => {}}
        onConfirmActions={() => {}}
        onSetExpandedRound={() => {}}
        onPauseToggle={() => {}}
        error={null}
        isCustomScenario={false}
        onMakePublic={() => {}}
        onOpenFeedback={() => {}}
      />
    );

    const action = screen.getByTestId('action-selection');
    const log = screen.getByTestId('event-log');
    // Event Log should appear later in the DOM (i.e., below actions)
    const isFollowing = !!(action.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(isFollowing).toBe(true);
  });
});

