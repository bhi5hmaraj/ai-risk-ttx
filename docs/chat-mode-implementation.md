# Chat Mode Implementation

## Overview

Chat mode replaces single-shot LLM API calls with a persistent conversation thread throughout the game. This provides several key benefits:

1. **Context Caching**: System prompt (game rules, roles, objectives) is cached by the LLM provider, reducing costs by ~90% on repeated calls
2. **Better Narrative Continuity**: LLM naturally maintains context from previous rounds through conversation history
3. **Improved Cause-and-Effect**: LLM can reference specific player actions from earlier rounds without explicit context passing
4. **Cost Savings**: Cached tokens are charged at 10% of normal rates

## Architecture

### Core Components

**services/chatSession.ts**
- `GameChatSession` class: Manages persistent conversation with message history
- `createGameMasterSystemPrompt()`: Generates comprehensive system prompt with game context
- `createGameSession()`: Factory function to initialize a new chat session

**services/geminiService.ts**
- `generateInitialScenarioChat()`: Chat-mode version of initial scenario generation
- `generateConsequencesChat()`: Chat-mode version of consequence generation with explicit references

**hooks/useGameController.ts**
- `chatSessionRef`: Ref to maintain chat session throughout game lifecycle
- Conditional logic based on `GAME_CONFIG.USE_CHAT_MODE` feature flag

### Message Flow

```
Game Start → Create Chat Session with System Prompt (CACHED)
    ↓
Round 0: Generate Initial Scenario
    ↓
Round 1-5: For each round:
    - User message: "Here's what happened this round..."
    - Assistant response: Consequences + next event
    - History automatically maintained
    ↓
Game End → Session cleanup
```

## Feature Flag

The implementation is gated behind a feature flag in `constants.tsx`:

```typescript
export const GAME_CONFIG = {
  // ...
  USE_CHAT_MODE: true, // Enable chat mode for better context and caching
};
```

Set to `false` to revert to the original single-shot API call behavior.

## Implementation Details

### Session Lifecycle

1. **Creation**:
   - Classic scenario: Session created in `initializeClassicScenario()` with generated/default setup
   - Preset scenario (AI Safety): Session created in `initializePresetScenario()` with predefined setup
   - Custom scenario: Session created in `initializeClassicScenario()` with user-generated setup

2. **Usage**:
   - Initial scenario: `generateInitialScenarioChat(session)`
   - Each round: `generateConsequencesChat(session, gameState, players, counterfactual)`

3. **Cleanup**:
   - Session cleared in `resetState()` when returning to lobby

### Prompt Design

**System Prompt** (cached):
- Game Master role and responsibilities
- Complete scenario setup and stakeholder information
- Critical narrative requirements emphasizing continuity
- Response format specifications

**User Messages** (dynamic):
- Current game state (round, scores, crisis)
- Player actions taken this round
- Counterfactual analysis
- Specific instructions for generating consequences

### Backward Compatibility

When `USE_CHAT_MODE` is `false`:
- Original `generateInitialScenario()` is called
- Original `generateConsequences()` is called
- No chat session is created or maintained

This allows A/B testing and easy rollback if issues arise.

## Testing Recommendations

1. **Narrative Continuity**:
   - Play through multiple rounds
   - Check if round summaries reference specific actions from previous rounds
   - Verify "Next Event" descriptions connect to player decisions

2. **Cost Analysis**:
   - Monitor LiteLLM dashboard for token usage
   - Compare cached vs non-cached token costs
   - Expected: ~90% reduction in input token costs after first call

3. **Error Handling**:
   - Test with chat mode enabled and LLM failures
   - Verify graceful fallback messaging
   - Confirm session cleanup on errors

4. **Comparison Testing**:
   - Run games with `USE_CHAT_MODE: true` and `USE_CHAT_MODE: false`
   - Compare narrative quality and coherence
   - Verify both modes produce valid game states

## Known Limitations

1. **Session State**: Session is stored in a ref and lost on page refresh (by design)
2. **Context Window**: Very long games (>5 rounds with many actions) may approach context limits
3. **Fallback**: If chat mode fails, no automatic fallback to single-shot mode (considered feature, not bug)

## Future Enhancements

1. **Session Persistence**: Store conversation history in game state for resume after refresh
2. **Dynamic Context Pruning**: Remove old rounds if approaching context limits
3. **Hybrid Mode**: Use chat for narrative, single-shot for counterfactuals/options
4. **Telemetry**: Track conversation length and context efficiency metrics
