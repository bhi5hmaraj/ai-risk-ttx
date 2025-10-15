# Game Components

UI components for Crisis Command gameplay.

## Feedback System Components

### FeedbackBanner

Unobtrusive top banner that prompts users to share feedback.

**Features:**
- Appears after Round 1 completes
- Can be dismissed for 24 hours (localStorage)
- Disappears permanently after feedback is submitted
- Smooth slide-down animation
- Responsive design

**Usage:**
```tsx
import { FeedbackBanner } from './components/game/FeedbackBanner';

function GameScreen() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const currentRound = 2; // from game state

  return (
    <>
      <FeedbackBanner
        currentRound={currentRound}
        onOpenFeedback={() => setShowFeedbackModal(true)}
      />
      {/* rest of game UI */}
    </>
  );
}
```

### FeedbackModal

Full-featured modal with feedback form using React Hook Form.

**Features:**
- 6 rating sliders (1-10 scale) for different aspects
- Optional text areas for detailed feedback
- Multi-select demographics checkboxes
- Email input with validation
- Loading states during submission
- Success/error messages
- Auto-closes after successful submission

**Form Fields:**
- **Ratings (1-10)**: UI, Game Dynamics, Model Quality, Scenario, Actions, Stakeholders
- **Text Responses**: Scenario usefulness, Counterfactual time, Improvements
- **Demographics**: Tech, Policy, Creative (multi-select)
- **Contact**: Email (optional), Collaboration interest (checkbox)

**Usage:**
```tsx
import { FeedbackModal } from './components/game/FeedbackModal';
import type { GameMetadata } from '../../types/feedback';

function GameScreen() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const gameMetadata: GameMetadata = {
    model: import.meta.env.VITE_LLM_MODEL,
    scenarioType: 'classic', // or 'ai_safety' | 'custom'
    rolePlayed: humanPlayer.role.name,
    roundsCompleted: gameState.round,
    finalPublicScore: gameState.coreMetric.value,
    customPromptUsed: false,
    customPrompt: undefined,
  };

  return (
    <>
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        gameMetadata={gameMetadata}
      />
      {/* rest of game UI */}
    </>
  );
}
```

### Complete Integration Example

```tsx
import React, { useState } from 'react';
import { FeedbackBanner } from './components/game/FeedbackBanner';
import { FeedbackModal } from './components/game/FeedbackModal';
import type { GameMetadata } from '../types/feedback';

function GameScreen() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // From game state
  const currentRound = 3;
  const humanPlayer = { role: { name: 'Tech CEO' } };
  const gameState = {
    round: 3,
    coreMetric: { value: 65 },
  };

  // Build game metadata for feedback
  const gameMetadata: GameMetadata = {
    model: import.meta.env.VITE_LLM_MODEL || 'unknown',
    scenarioType: 'classic',
    rolePlayed: humanPlayer.role.name,
    roundsCompleted: gameState.round,
    finalPublicScore: gameState.coreMetric.value,
    customPromptUsed: false,
  };

  return (
    <div className="relative min-h-screen">
      {/* Feedback Banner (top of screen) */}
      <FeedbackBanner
        currentRound={currentRound}
        onOpenFeedback={() => setShowFeedbackModal(true)}
      />

      {/* Feedback Modal (overlay) */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        gameMetadata={gameMetadata}
      />

      {/* Game content */}
      <div className="pt-16">{/* Add padding-top to account for banner */}</div>
    </div>
  );
}
```

## Other Game Components

- **ActionSelection** - Player action selection interface
- **ActionTreeModal** - Visual graph of all player actions
- **ActionTreePortal** - Portal container for action tree
- **EventLog** - Round-by-round event history
- **GameStatusPanel** - Current game status display
- **RoleCard** - Player role information card
- **RoundSnapshotCard** - Summary card for completed rounds
