## Session Replay System

### Overview

**For Admins:** Debug what happened in any game
**For Users:** Retrospective analysis after game ends

### Design Principles

1. **Append-only snapshots** - Save state after every round
2. **Event sourcing** - Reconstruct timeline from events
3. **Differential access** - Admins see everything, users see filtered view
4. **Performance** - Lazy-load snapshots, don't replay in real-time

### Database Schema (Already Added Above)

```prisma
model GameSnapshot {
  id        String   @id
  gameId    String
  round     Int
  timestamp DateTime
  gameState Json     // Full state
  events    Json     // Actions + consequences

  // Metadata for debugging
  systemPromptId String?
  aiLatency      Int?
  errorCount     Int @default(0)
}
```

### Snapshot Creation (Automatic)

```typescript
// game-server/rooms/GameRoom.ts
export class GameRoom extends Room<GameState> {

  async advanceRound() {
    // Apply consequences, update scores, etc.
    this.state.round++;

    // Save snapshot (async, doesn't block game)
    this.saveSnapshot().catch(err => {
      logger.error('Failed to save snapshot', {
        roomId: this.roomId,
        round: this.state.round,
        error: err.message,
      });
    });
  }

  private async saveSnapshot() {
    await db.gameSnapshot.create({
      data: {
        gameId: this.roomId,
        round: this.state.round,
        timestamp: new Date(),

        // Full game state (can reconstruct everything)
        gameState: this.state.toJSON(),

        // Recent events (actions, consequences)
        events: {
          actions: this.currentRoundActions,
          consequences: this.currentRoundConsequences,
          aiResponses: this.currentRoundAIResponses,
        },

        // Debugging metadata
        systemPromptId: this.metadata.promptVersions.system,
        aiLatency: this.lastAICallLatency,
        errorCount: this.errorsThisRound,
      },
    });
  }
}
```

### Admin Replay UI

**URL:** `/admin/replay/[gameId]`

**Features:**
- Timeline scrubber
- State inspector (JSON tree)
- Event viewer (chronological)
- Prompt version links
- Performance metrics

**Component:**

```typescript
// pages/admin/replay/[gameId].tsx
export default function AdminReplay() {
  const router = useRouter();
  const { gameId } = router.query;

  const [snapshots, setSnapshots] = useState<GameSnapshot[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'timeline' | 'state' | 'events'>('timeline');

  useEffect(() => {
    fetchSnapshots(gameId as string).then(setSnapshots);
  }, [gameId]);

  const currentSnapshot = snapshots.find(s => s.round === selectedRound);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <Link href="/admin/dashboard" className="text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Game Replay: {gameId}</h1>
      </header>

      {/* Timeline Scrubber */}
      <div className="mb-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <div className="flex items-center gap-2">
          {snapshots.map((snapshot) => (
            <button
              key={snapshot.round}
              onClick={() => setSelectedRound(snapshot.round)}
              className={`
                px-4 py-2 rounded transition-all
                ${selectedRound === snapshot.round
                  ? 'bg-blue-600 scale-110'
                  : 'bg-gray-700 hover:bg-gray-600'
                }
              `}
            >
              Round {snapshot.round}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-4 mb-6">
        {['timeline', 'state', 'events'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={`px-4 py-2 rounded ${
              viewMode === mode ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'timeline' && (
        <TimelineView snapshot={currentSnapshot} />
      )}

      {viewMode === 'state' && (
        <StateInspector state={currentSnapshot.gameState} />
      )}

      {viewMode === 'events' && (
        <EventsViewer events={currentSnapshot.events} />
      )}

      {/* Metadata Footer */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400">Prompt Version:</span>
            <Link
              href={`/admin/prompts?id=${currentSnapshot.systemPromptId}`}
              className="ml-2 text-blue-400 hover:underline"
            >
              v{currentSnapshot.systemPrompt?.version}
            </Link>
          </div>
          <div>
            <span className="text-gray-400">AI Latency:</span>
            <span className="ml-2">{currentSnapshot.aiLatency}ms</span>
          </div>
          <div>
            <span className="text-gray-400">Errors:</span>
            <span className="ml-2">{currentSnapshot.errorCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineView({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Round {snapshot.round}</h2>

      {/* Player Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Player Actions</h3>
        <div className="space-y-2">
          {snapshot.events.actions?.map((action: any, i: number) => (
            <div key={i} className="p-3 bg-gray-700 rounded">
              <div className="font-semibold">{action.player.role}</div>
              <div className="text-sm text-gray-300">{action.action.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                Cost: {action.action.cost} points
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Responses */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">AI Responses</h3>
        <div className="space-y-2">
          {snapshot.events.aiResponses?.map((response: any, i: number) => (
            <div key={i} className="p-3 bg-blue-900 rounded">
              <div className="font-semibold">{response.agent}</div>
              <div className="text-sm text-gray-300 mt-1">{response.message}</div>
              <details className="mt-2">
                <summary className="text-xs text-blue-400 cursor-pointer">
                  Show AI Reasoning
                </summary>
                <pre className="text-xs bg-gray-800 p-2 mt-1 rounded overflow-auto">
                  {JSON.stringify(response.reasoning, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Consequences */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Consequences</h3>
        <div className="p-4 bg-yellow-900 rounded">
          <div className="text-sm mb-2">{snapshot.events.consequences?.narrative}</div>
          <div className="text-xs text-gray-300">
            Public Score: {snapshot.gameState.publicScore}
            ({snapshot.events.consequences?.scoreChange > 0 ? '+' : ''}
            {snapshot.events.consequences?.scoreChange})
          </div>
        </div>
      </div>
    </div>
  );
}

function StateInspector({ state }: { state: any }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Game State (JSON)</h2>
      <JSONTree data={state} theme="monokai" invertTheme={false} />
    </div>
  );
}

function EventsViewer({ events }: { events: any }) {
  const allEvents = [
    ...events.actions?.map((a: any) => ({ type: 'action', ...a })) || [],
    ...events.aiResponses?.map((a: any) => ({ type: 'ai', ...a })) || [],
    { type: 'consequence', ...events.consequences },
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Event Log</h2>
      <div className="space-y-2">
        {allEvents.map((event, i) => (
          <div key={i} className="p-3 bg-gray-700 rounded text-sm">
            <span className="text-gray-400">{formatTime(event.timestamp)}</span>
            <span className="ml-3 font-semibold">[{event.type}]</span>
            <span className="ml-2">{event.description || event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### User Retrospective UI

**URL:** `/retrospective/[gameId]` (Accessible after game ends)

**Features:**
- Same timeline scrubber
- **Filtered view:** Hide admin data, AI reasoning (show at end)
- **Reveal hidden scores** at the end
- **"What if" scenarios** (counterfactual analysis)
- **Share link** with other players

**Differences from Admin View:**

| Feature | Admin | User |
|---------|-------|------|
| Hidden scores | Always visible | Revealed at end |
| AI reasoning | Full details | Summary only |
| Prompt versions | Links to versions | Not shown |
| Performance metrics | All metrics | None |
| Debug info | Full state | Filtered |
| "What if" scenarios | No | Yes (engaging!) |

**Component:**

```typescript
// pages/retrospective/[gameId].tsx
export default function UserRetrospective() {
  const { gameId } = useRouter().query;
  const [game, setGame] = useState<Game | null>(null);
  const [snapshots, setSnapshots] = useState<GameSnapshot[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [revealHiddenScores, setRevealHiddenScores] = useState(false);

  useEffect(() => {
    fetchGameData(gameId as string).then(data => {
      setGame(data.game);
      setSnapshots(data.snapshots);

      // Auto-reveal if game is complete
      if (data.game.status === 'completed') {
        setRevealHiddenScores(true);
      }
    });
  }, [gameId]);

  const currentSnapshot = snapshots.find(s => s.round === selectedRound);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Game Retrospective</h1>
        <p className="text-gray-400">
          Played on {formatDate(game.createdAt)} • {game.rounds} rounds
        </p>
      </header>

      {/* Final Scores (if revealed) */}
      {revealHiddenScores && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Final Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {game.players.map(player => (
              <div key={player.id} className="p-4 bg-black bg-opacity-30 rounded">
                <div className="font-semibold">{player.role}</div>
                <div className="text-sm text-gray-300 mt-1">
                  Hidden Objective: {player.hiddenObjective}
                </div>
                <div className="text-2xl font-bold mt-2">
                  {player.hiddenScore} points
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <div className="text-lg">Public Score (Democratic Legitimacy)</div>
            <div className="text-4xl font-bold mt-2">{game.finalPublicScore}</div>
          </div>
        </div>
      )}

      {/* Timeline Scrubber (same as admin) */}
      <div className="mb-8">
        <TimelineScrubber
          snapshots={snapshots}
          selected={selectedRound}
          onSelect={setSelectedRound}
        />
      </div>

      {/* Round Details */}
      <RoundRetrospective
        snapshot={currentSnapshot}
        showHiddenScores={revealHiddenScores}
      />

      {/* "What If" Scenarios */}
      {revealHiddenScores && (
        <WhatIfAnalysis
          snapshot={currentSnapshot}
          gameId={gameId as string}
        />
      )}

      {/* Share with Players */}
      <div className="mt-8 text-center">
        <button className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700">
          Share Retrospective Link
        </button>
      </div>
    </div>
  );
}

function WhatIfAnalysis({ snapshot, gameId }: {
  snapshot: GameSnapshot;
  gameId: string;
}) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  const runWhatIf = async () => {
    // Call API to re-run consequences with different action
    const result = await fetch(`/api/what-if`, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        round: snapshot.round,
        alternateAction: selectedAction,
      }),
    }).then(r => r.json());

    setWhatIfResult(result);
  };

  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">
        💭 What If Analysis
      </h2>
      <p className="text-gray-400 mb-4">
        See how the round would have played out with different actions
      </p>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          Choose an alternate action:
        </label>
        <select
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 rounded"
        >
          <option value="">Select action...</option>
          {snapshot.events.allPossibleActions?.map((action: any) => (
            <option key={action.id} value={action.id}>
              {action.title}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={runWhatIf}
        disabled={!selectedAction}
        className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        Run Simulation
      </button>

      {whatIfResult && (
        <div className="mt-6 p-4 bg-purple-900 bg-opacity-50 rounded">
          <h3 className="font-semibold mb-2">Alternate Timeline:</h3>
          <p className="text-sm">{whatIfResult.narrative}</p>
          <div className="mt-3 text-xs">
            <div>Public Score Change:
              <span className={whatIfResult.scoreChange > 0 ? 'text-green-400' : 'text-red-400'}>
                {whatIfResult.scoreChange > 0 ? '+' : ''}{whatIfResult.scoreChange}
              </span>
              (Actual: {snapshot.events.consequences.scoreChange})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### API for "What If" Analysis

```typescript
// pages/api/what-if.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, round, alternateAction } = req.body;

  // Load original snapshot
  const snapshot = await db.gameSnapshot.findFirst({
    where: { gameId, round },
  });

  // Reconstruct game state
  const gameState = snapshot.gameState;

  // Replace one action with alternate
  const modifiedActions = snapshot.events.actions.map((a: any) =>
    a.player.isHuman ? { ...a, action: alternateAction } : a
  );

  // Re-run consequence generation (using same prompt version)
  const prompt = await db.promptVersion.findUnique({
    where: { id: snapshot.consequencePromptId },
  });

  const whatIfConsequences = await geminiService.generateConsequences({
    gameState,
    actions: modifiedActions,
    prompt: prompt.content,
  });

  res.json({
    narrative: whatIfConsequences.narrative,
    scoreChange: whatIfConsequences.scoreChange,
    comparison: {
      original: snapshot.events.consequences.scoreChange,
      alternate: whatIfConsequences.scoreChange,
      difference: whatIfConsequences.scoreChange - snapshot.events.consequences.scoreChange,
    },
  });
}
```

---

### Summary: What You Get

**Prompt Management:**
- ✅ Version-controlled prompts (append-only)
- ✅ Admin UI to create/activate versions
- ✅ Full audit trail (who, when, why)
- ✅ A/B testing capability
- ✅ Instant rollback
- ✅ Know which prompt each game used

**Session Replay (Admin):**
- ✅ Timeline of every round
- ✅ Full state inspection
- ✅ Event viewer (chronological)
- ✅ Prompt version links
- ✅ Performance metrics
- ✅ Debug info

**Session Replay (User):**
- ✅ Same timeline (filtered view)
- ✅ Hidden scores revealed at end
- ✅ "What if" scenarios (engaging!)
- ✅ Share link with other players
- ✅ Beautiful retrospective UI

**Time to Build:**
- Prompt management: 1 day (Day 8)
- Admin replay: 1 day (Day 9)
- User retrospective: 1 day (Day 10)
- Total: 3 days

**Priority:** MEDIUM-HIGH (Do after core Colyseus migration, before IRL event)

---

