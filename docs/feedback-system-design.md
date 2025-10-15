# Feedback System Design

## Overview
A flexible feedback collection system that allows users to provide feedback at any point during gameplay via an unobtrusive banner/modal interface.

## Schema Evolution Strategy

### Core Principle: Versioned JSON Schema

All feedback submissions include a `schemaVersion` field to enable graceful handling of schema changes over time.

```typescript
interface FeedbackData {
  schemaVersion: string;  // e.g., "1.0.0", "1.1.0", "2.0.0"
  // ... rest of data
}
```

### Version Migration Patterns

#### 1. **Additive Changes (Minor Version Bumps)**
Adding new optional fields - fully backward compatible.

**Example: Adding "replay interest" field**
```typescript
// v1.0.0 → v1.1.0
interface FeedbackDataV1_1 extends FeedbackDataV1_0 {
  responses: {
    // ... existing fields
    replayInterest?: number;  // NEW: optional field
  };
}
```

**Handling:**
- Old submissions (v1.0.0) remain valid
- Analytics queries use `?.` optional chaining
- No migration needed

#### 2. **Breaking Changes (Major Version Bumps)**
Removing fields or changing field types.

**Example: Splitting "background" into separate fields**
```typescript
// v1.0.0
demographics: {
  background: ('tech' | 'policy' | 'creative')[];
}

// v2.0.0
demographics: {
  technicalExperience: 'none' | 'beginner' | 'intermediate' | 'expert';
  policyExperience: 'none' | 'beginner' | 'intermediate' | 'expert';
  communicationExperience: 'none' | 'beginner' | 'intermediate' | 'expert';
}
```

**Handling:**
- Keep both versions in TypeScript as discriminated unions
- Analytics layer applies transformations
- Migration functions convert old → new format for unified analysis

```typescript
type FeedbackData =
  | { schemaVersion: '1.0.0'; /* v1 fields */ }
  | { schemaVersion: '2.0.0'; /* v2 fields */ };

function normalizeFeedback(data: FeedbackData): NormalizedFeedback {
  switch (data.schemaVersion) {
    case '1.0.0':
      return migrateV1ToLatest(data);
    case '2.0.0':
      return data; // already latest
  }
}
```

#### 3. **Deprecation Process**
1. Add new fields (minor bump)
2. Support both old and new for N months
3. Show deprecation warning in admin analytics
4. Remove old fields (major bump)

### Database Strategy

#### Prisma Schema
```prisma
model Feedback {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  // Version tracking
  schemaVersion String @default("1.0.0")

  // Full data as JSON (flexible)
  data        Json

  // Denormalized fields for fast querying
  model       String?
  scenarioType String?
  rolePlayed  String?
  gameCompleted Boolean @default(false)
  avgRating   Float?

  @@index([schemaVersion])
  @@index([createdAt])
}
```

#### PostgreSQL JSON Queries
PostgreSQL's JSONB operators allow querying even with schema variations:

```sql
-- Works across schema versions if field exists
SELECT data->>'ratings'->>'ui' as ui_rating
FROM "Feedback"
WHERE data->>'ratings'->>'ui' IS NOT NULL;

-- Version-specific queries
SELECT * FROM "Feedback"
WHERE schemaVersion = '1.0.0'
  AND data->'demographics'->'background' ? 'tech';
```

### Frontend Form Versioning

#### Form Definition Registry
```typescript
// formRegistry.ts
export const FEEDBACK_FORMS = {
  '1.0.0': FeedbackFormV1,
  '1.1.0': FeedbackFormV1_1,
  '2.0.0': FeedbackFormV2,
} as const;

export const CURRENT_FORM_VERSION = '1.0.0';
```

#### Submission Handler
```typescript
async function submitFeedback(formData: any) {
  const submission = {
    schemaVersion: CURRENT_FORM_VERSION,
    data: formData,
    meta: {
      submittedAt: new Date().toISOString(),
      sessionId: generateSessionId(),
    },
  };

  await fetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}
```

### Analytics & Reporting

#### Version-Aware Queries
```typescript
// analytics/feedbackAnalytics.ts
interface AnalyticsQuery {
  schemaVersions?: string[];  // Filter by versions
  dateRange?: [Date, Date];
}

async function getAverageRatings(query: AnalyticsQuery) {
  const feedbacks = await prisma.feedback.findMany({
    where: {
      schemaVersion: { in: query.schemaVersions || ['1.0.0'] },
      createdAt: {
        gte: query.dateRange?.[0],
        lte: query.dateRange?.[1],
      },
    },
  });

  // Normalize across schema versions
  return feedbacks.map(normalizeFeedback).reduce(...);
}
```

#### Admin Dashboard
- Show schema version distribution
- Flag deprecated versions
- Preview migration impact before applying

### Testing Strategy

#### Snapshot Tests for Schema Changes
```typescript
describe('Feedback Schema Migrations', () => {
  it('migrates v1.0.0 to v2.0.0', () => {
    const v1Data = mockFeedbackV1();
    const migrated = migrateV1ToLatest(v1Data);
    expect(migrated).toMatchSnapshot();
  });

  it('handles missing optional fields gracefully', () => {
    const incomplete = { schemaVersion: '1.0.0', /* partial data */ };
    expect(() => normalizeFeedback(incomplete)).not.toThrow();
  });
});
```

### Rollout Strategy for Major Changes

1. **Phase 1: Shadow Testing**
   - Deploy new form version to 10% of users
   - Monitor submission success rates
   - Compare analytics between versions

2. **Phase 2: Gradual Rollout**
   - Increase to 50%, then 100%
   - Keep old version available via feature flag
   - Monitor error rates and data quality

3. **Phase 3: Deprecation**
   - Stop showing old form
   - Keep reading old data for analytics
   - After 6 months, optionally migrate old data

### Monitoring & Alerts

```typescript
// Track schema version distribution
await analytics.track('feedback_submitted', {
  schemaVersion: submission.schemaVersion,
  fieldsCompleted: countCompletedFields(submission),
  completionRate: calculateCompletionRate(submission),
});

// Alert on unexpected versions
if (!SUPPORTED_VERSIONS.includes(submission.schemaVersion)) {
  logger.warn('Unknown schema version', { version: submission.schemaVersion });
}
```

## Architecture Diagram

```
User Input
    ↓
FeedbackForm (v1.0.0)
    ↓
{ schemaVersion: "1.0.0", data: {...} }
    ↓
POST /api/feedback
    ↓
Prisma → PostgreSQL (JSONB)
    ↓
Analytics Layer (normalization)
    ↓
Admin Dashboard
```

## Benefits of This Approach

✅ **Zero downtime** for schema changes
✅ **No data loss** from old submissions
✅ **Flexible analytics** across versions
✅ **Easy A/B testing** of form variations
✅ **Future-proof** for unknown requirements
✅ **Simple rollback** if new version has issues

## Trade-offs

⚠️ **More complex queries** - need version awareness
⚠️ **Migration code** - must maintain transformation functions
⚠️ **Testing overhead** - test all supported versions

These trade-offs are acceptable given the flexibility gained for a user-facing feedback system.

---

## Current Schema: v1.0.0

```typescript
interface FeedbackDataV1 {
  schemaVersion: '1.0.0';

  ratings: {
    ui: number;                    // 1-10
    gameDynamics: number;          // 1-10
    modelQuality: number;          // 1-10
    scenario: number;              // 1-10
    actions: number;               // 1-10
    stakeholders: number;          // 1-10
  };

  gameMetadata: {
    model: string;                 // LLM model used
    scenarioType: 'classic' | 'ai_safety' | 'custom';
    rolePlayed: string;            // Role name
    roundsCompleted: number;       // How many rounds played
    finalPublicScore: number | null; // null if didn't finish
    customPromptUsed: boolean;
    customPrompt?: string;         // if customPromptUsed = true
  };

  responses: {
    scenarioUsefulness?: string;   // Optional text
    counterfactualTime?: string;   // Optional text
    improvements?: string;         // Optional text
  };

  demographics: {
    background: ('tech' | 'policy' | 'creative')[]; // Multi-select
  };

  contact: {
    email?: string;
    wantsCollaboration: boolean;
  };

  meta: {
    sessionId: string;
    submittedAt: string;           // ISO 8601
  };
}
```

---

## Prompt Versioning System (Future)

### Overview
Track all LLM prompts used in the game with version control, linking feedback submissions to specific prompt versions for quality analysis and A/B testing.

### Database Schema for Prompt Versioning

```prisma
model PromptVersion {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  // Prompt identification
  promptType  String   // 'initial_scenario' | 'action_options' | 'consequences' | 'counterfactual' | 'custom_scenario'
  version     String   // Semantic version: "1.0.0", "1.1.0", "2.0.0"

  // Prompt content
  template    String   @db.Text  // Full prompt template with placeholders
  description String?  // Human-readable change description

  // Metadata
  isActive    Boolean  @default(true)  // Current active version for this prompt type
  author      String?  // Who created/modified this version

  // Relations
  gameSessions GameSession[]

  @@unique([promptType, version])
  @@index([promptType, isActive])
  @@index([createdAt])
}

model GameSession {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Session data
  sessionId   String   @unique  // Matches frontend sessionId

  // Prompt versions used in this session
  initialScenarioPromptId    String?
  actionOptionsPromptId      String?
  consequencesPromptId       String?
  counterfactualPromptId     String?
  customScenarioPromptId     String?

  // Relations
  initialScenarioPrompt    PromptVersion? @relation(fields: [initialScenarioPromptId], references: [id])

  // Game metadata snapshot
  gameData    Json     // Store final game state, rounds played, scores, etc.

  // Relations
  feedback    Feedback[]

  @@index([sessionId])
  @@index([createdAt])
}

// Update Feedback model to link to GameSession
model Feedback {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  schemaVersion String @default("1.0.0")
  data        Json

  // Denormalized fields
  model       String?
  scenarioType String?
  rolePlayed  String?
  gameCompleted Boolean @default(false)
  avgRating   Float?

  // Link to session (and thus to prompt versions)
  sessionId   String?
  gameSession GameSession? @relation(fields: [sessionId], references: [sessionId])

  @@index([schemaVersion])
  @@index([createdAt])
  @@index([sessionId])
}
```

### Implementation Strategy

#### 1. Prompt Storage
**Current**: Prompts hardcoded in `prompts.ts`
**Future**: Load prompts from database at runtime

```typescript
// services/promptService.ts
export async function getActivePrompt(
  promptType: PromptType
): Promise<PromptVersion> {
  return await prisma.promptVersion.findFirst({
    where: {
      promptType,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// With fallback to hardcoded prompts
export async function getPromptTemplate(
  promptType: PromptType
): Promise<string> {
  try {
    const activePrompt = await getActivePrompt(promptType);
    return activePrompt.template;
  } catch (error) {
    // Fallback to hardcoded prompts in prompts.ts
    return FALLBACK_PROMPTS[promptType];
  }
}
```

#### 2. Session Tracking

```typescript
// Track prompt versions used in game session
export async function createGameSession(
  sessionId: string,
  promptVersions: {
    initialScenario: string;
    actionOptions: string;
    consequences: string;
    counterfactual: string;
  }
): Promise<void> {
  await prisma.gameSession.create({
    data: {
      sessionId,
      initialScenarioPromptId: promptVersions.initialScenario,
      actionOptionsPromptId: promptVersions.actionOptions,
      consequencesPromptId: promptVersions.consequences,
      counterfactualPromptId: promptVersions.counterfactual,
      gameData: {},
    },
  });
}

// Update at game end
export async function finalizeGameSession(
  sessionId: string,
  finalGameState: GameState,
  players: Player[]
): Promise<void> {
  await prisma.gameSession.update({
    where: { sessionId },
    data: {
      gameData: {
        finalState: finalGameState,
        players: players,
        completedAt: new Date().toISOString(),
      },
    },
  });
}
```

#### 3. Feedback Linking

Updated feedback submission to link with session:

```typescript
// api/feedback.ts
export async function submitFeedback(
  feedbackData: FeedbackData
): Promise<void> {
  const { sessionId } = feedbackData.meta;

  await prisma.feedback.create({
    data: {
      schemaVersion: feedbackData.schemaVersion,
      data: feedbackData,
      model: feedbackData.gameMetadata.model,
      scenarioType: feedbackData.gameMetadata.scenarioType,
      rolePlayed: feedbackData.gameMetadata.rolePlayed,
      gameCompleted: feedbackData.gameMetadata.finalPublicScore !== null,
      avgRating: calculateAvgRating(feedbackData.ratings),
      sessionId: sessionId, // Links to GameSession
    },
  });
}
```

### Analytics Queries

#### Prompt Performance Analysis

```typescript
// Find average feedback rating by prompt version
async function analyzePromptPerformance(
  promptType: PromptType
): Promise<PromptAnalysis[]> {
  const results = await prisma.$queryRaw`
    SELECT
      pv.version,
      pv.description,
      COUNT(f.id) as feedback_count,
      AVG(f.avgRating) as avg_feedback_rating,
      AVG((f.data->'gameMetadata'->>'roundsCompleted')::int) as avg_rounds_completed
    FROM "PromptVersion" pv
    JOIN "GameSession" gs ON pv.id = gs.initialScenarioPromptId
    JOIN "Feedback" f ON gs.sessionId = f.sessionId
    WHERE pv.promptType = ${promptType}
    GROUP BY pv.version, pv.description
    ORDER BY pv.createdAt DESC
  `;

  return results;
}

// Compare two prompt versions
async function comparePromptVersions(
  promptType: PromptType,
  versionA: string,
  versionB: string
): Promise<ComparisonResult> {
  // Statistical comparison of feedback metrics
  // between two prompt versions
}
```

#### A/B Testing Support

```typescript
// Randomly assign users to prompt versions
export async function getPromptForABTest(
  promptType: PromptType,
  sessionId: string
): Promise<PromptVersion> {
  const activeVersions = await prisma.promptVersion.findMany({
    where: {
      promptType,
      isActive: true, // Multiple versions can be active for A/B testing
    },
  });

  // Consistent assignment based on session ID
  const hash = hashSessionId(sessionId);
  const index = hash % activeVersions.length;
  return activeVersions[index];
}
```

### Migration Path

**Phase 1**: Keep current hardcoded prompts
- ✅ Already done: Feedback system with sessionId

**Phase 2**: Add prompt tracking (ai-risk-ttx-8)
- Create PromptVersion and GameSession models
- Migrate current prompts from `prompts.ts` to database
- Track which prompts are used in each game session

**Phase 3**: Dynamic prompt loading
- Load prompts from database at runtime
- Admin UI for creating/editing prompt versions
- Enable/disable specific versions

**Phase 4**: A/B Testing
- Multi-version activation support
- Randomized assignment
- Statistical analysis tools

### Benefits

✅ **Track prompt evolution** - See how changes affect gameplay quality
✅ **A/B testing** - Compare prompt variations systematically
✅ **Quality analysis** - Link feedback ratings to specific prompt versions
✅ **Rollback capability** - Revert to previous prompt versions instantly
✅ **Experimentation** - Test radical prompt changes on subset of users
✅ **Reproducibility** - Replay games with exact prompts used

### Use Cases

1. **Feedback correlation**: "Did prompt v2.1 increase scenario ratings?"
2. **Quality regression**: "Why did completion rates drop after v1.5?"
3. **Optimization**: "Which consequence prompt leads to best narrative quality?"
4. **Custom scenarios**: Track which user-submitted prompts perform best
