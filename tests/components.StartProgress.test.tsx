/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StartProgress } from '../components/StartProgress';
import { useUIStore } from '../stores/uiStore';

describe('StartProgress HUD', () => {
  it('shows steps and updates visibility based on store', () => {
    const set = useUIStore.getState();
    set.setStartProgress({ creatingSession: 'running', buildingPlayers: 'idle', generatingScenario: 'idle', connectingStream: 'idle', ready: 'idle' });

    render(<StartProgress />);

    // Panel visible with at least one running step
    expect(screen.queryByText(/Game Setup/i)).toBeTruthy();
    expect(screen.queryByText(/Creating session/i)).toBeTruthy();

    // Mark all done -> panel remains but shows done states
    set.setStartProgress({ creatingSession: 'done', buildingPlayers: 'done', generatingScenario: 'done', connectingStream: 'done', ready: 'done' });

    // Rerender to reflect store change in test
    render(<StartProgress />);
    expect(screen.queryByText(/Ready/i)).toBeTruthy();
  });
});

