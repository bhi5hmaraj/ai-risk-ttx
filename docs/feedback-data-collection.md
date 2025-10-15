# Feedback Data Collection

Documentation on how client data is collected for the feedback system.

## Overview

The feedback system captures comprehensive game metadata automatically from the application state, requiring no manual data entry from users beyond their feedback responses.

## Data Flow Diagram

```
User plays game
    ↓
Game state tracked by useGameController
    ↓
App.tsx builds GameMetadata object
    ↓
FeedbackModal receives gameMetadata prop
    ↓
User submits feedback form
    ↓
transformFormStateToFeedbackData() combines form + metadata
    ↓
submitFeedback() sends to API
    ↓
Database stores complete feedback
```

## GameMetadata Collection

### Location: `App.tsx`

The `gameMetadata` object is built in `App.tsx` from the game controller state:

```typescript
const gameMetadata: GameMetadata = {
  model: import.meta.env.VITE_LLM_MODEL || 'unknown',
  scenarioType: gamePath === 'ai_safety' ? 'ai_safety' : gamePath === 'custom' ? 'custom' : 'classic',
  rolePlayed: humanPlayer?.role.name || 'Unknown',
  roundsCompleted: gameState.round,
  finalPublicScore: gameState.phase === GamePhase.END ? gameState.coreMetric.value : null,
  customPromptUsed: gamePath === 'custom' && !!customScenario,
  customPrompt: gamePath === 'custom' ? customScenario : undefined,
};
```

### Field Sources

| Field | Source | Description |
|-------|--------|-------------|
| `model` | `import.meta.env.VITE_LLM_MODEL` | LLM model name from environment variables |
| `scenarioType` | `gamePath` state | 'classic', 'ai_safety', or 'custom' |
| `rolePlayed` | `humanPlayer.role.name` | Name of role the user selected |
| `roundsCompleted` | `gameState.round` | Current round number |
| `finalPublicScore` | `gameState.coreMetric.value` | Public score (null if game not finished) |
| `customPromptUsed` | `gamePath === 'custom' && !!customScenario` | Boolean indicating custom scenario |
| `customPrompt` | `customScenario` state | The actual custom prompt text (if used) |

## State Sources

### From `useGameController.ts`

**`gamePath`**: Set in LobbyScreen when user chooses scenario type
- **classic**: Default election crisis scenario
- **ai_safety**: Pre-built AI safety scenario
- **custom**: User-provided custom scenario

**`customScenario`**: Set in LobbyScreen when user enters custom scenario description
- Only populated if `gamePath === 'custom'`
- Contains the full text prompt provided by the user

**`humanPlayer`**: Derived from `players` array
- Contains role information chosen in LobbyScreen
- `humanPlayer.role.name` provides the role name

**`gameState`**: Central game state object
- `gameState.round`: Current round (1-5)
- `gameState.coreMetric.value`: Public score (0-100)
- `gameState.phase`: Current phase (LOBBY, ACTION, END, etc.)

### From Environment Variables

**`VITE_LLM_MODEL`**: Set in `.env` or Vercel environment
- Examples: "gpt-4o-mini", "gemini-2.5-flash", "claude-sonnet-4"
- Critical for tracking which model generated the game experience

## SessionId Generation

**Location**: `services/feedbackHelpers.ts`

```typescript
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}
```

- Generated once per browser session
- Persists across page reloads
- Format: `{timestamp}-{random-string}` (e.g., "1697123456789-abc123")
- Used to link multiple feedback submissions from same session

## Form State Transformation

**Location**: `types/feedback.ts`

The `transformFormStateToFeedbackData()` function combines:
1. **User form input** (ratings, text responses, demographics, email)
2. **Game metadata** (from App.tsx)
3. **Session metadata** (sessionId, timestamp)

```typescript
export function transformFormStateToFeedbackData(
  formState: FeedbackFormState,
  gameMetadata: GameMetadata,
  sessionId: string
): FeedbackDataV1 {
  return {
    schemaVersion: '1.0.0',
    ratings: { /* from form */ },
    gameMetadata: gameMetadata,  // ← Injected here
    responses: { /* from form */ },
    demographics: { /* from form */ },
    contact: { /* from form */ },
    meta: {
      sessionId: sessionId,      // ← Generated
      submittedAt: new Date().toISOString(), // ← Generated
    },
  };
}
```

## Data Validation

All collected data goes through Zod validation:

**Client-side**: `feedbackDataV1Schema` validates complete structure
**Server-side**: API route re-validates with same schema

This ensures:
- No invalid data reaches the database
- Type safety throughout the pipeline
- Schema versioning for future changes

## Privacy Considerations

### What We Collect
- ✅ Game performance data (scores, rounds)
- ✅ Model/scenario configuration
- ✅ User-provided text feedback (optional)
- ✅ Email address (optional, only if user provides)
- ✅ Session ID (randomly generated, not personally identifiable)

### What We Don't Collect
- ❌ IP addresses
- ❌ Browser fingerprints
- ❌ Precise timestamps (only date, not time)
- ❌ User accounts or authentication data
- ❌ Personally identifiable information (unless voluntarily provided via email)

### User Control
- Users can dismiss feedback banner for 24 hours
- Feedback submission is entirely optional
- Email input is optional
- Users can choose not to provide text responses

## Debugging Data Collection

### Check gameMetadata in Browser Console

Add temporary logging in `App.tsx`:

```typescript
console.log('Game Metadata:', gameMetadata);
```

### Inspect Submission Payload

In `FeedbackModal.tsx`, log before submission:

```typescript
const feedbackData = transformFormStateToFeedbackData(data, gameMetadata, sessionId);
console.log('Submitting:', feedbackData);
```

### Verify Database Storage

Check Prisma Studio:
```bash
npx prisma studio
```

Query feedback entries and inspect the `data` JSON field.

## Future Enhancements

1. **Prompt Version Tracking** (ai-risk-ttx-8)
   - Link feedback to specific prompt versions
   - Enable A/B testing of prompt variations

2. **Session Replay**
   - Store full game state for each session
   - Allow replaying user sessions for debugging

3. **Analytics Dashboard**
   - Aggregate feedback by model
   - Compare scenario types
   - Track trends over time

## Related Files

- `App.tsx` - GameMetadata construction
- `types/feedback.ts` - Type definitions and transformation
- `services/feedbackHelpers.ts` - Session ID management
- `services/feedbackService.ts` - API submission
- `api/feedback.ts` - Server-side validation and storage
