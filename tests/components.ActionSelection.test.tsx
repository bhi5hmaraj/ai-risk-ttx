/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ActionSelection } from '../components/game/ActionSelection';

describe('ActionSelection', () => {
  it('shows full action descriptions without requiring tap/expand', () => {
    const long =
      'This is a very long description intended to exceed any prior preview clamp so it should render fully without ellipsis or requiring the item to be selected first. The entire sentence should be visible.';

    render(
      <ActionSelection
        options={[{ title: 'Long Action', description: long, cost: 1 }] as any}
        onConfirm={vi.fn()}
        isLoading={false}
        hasSubmitted={false}
        isPaused={false}
        players={[] as any}
        aiCompletionStatus={{}}
        availablePoints={3}
      />
    );

    // Full text should be present, not a shortened preview
    expect(screen.queryByText(long)).not.toBeNull();
    expect(screen.queryByText(/…$/)).toBeNull();
  });
});
