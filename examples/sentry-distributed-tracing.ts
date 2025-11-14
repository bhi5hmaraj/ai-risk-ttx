/**
 * Sentry Distributed Tracing Example
 *
 * Shows how a single trace flows across:
 * Next.js → Stein (Colyseus) → Matrix (Python)
 */

// ============================================================================
// STEIN SERVICE (TypeScript)
// ============================================================================

import * as Sentry from "@sentry/node";

export class GameRoom extends Room<GameState> {
  async handleAdvanceRound(client: Client, message: any) {
    // Start a transaction (Sentry tracks this automatically)
    const transaction = Sentry.startTransaction({
      name: 'advance_round',
      op: 'game',
      data: {
        roomId: this.roomId,
        round: this.state.round,
      },
    });

    // Set context
    Sentry.configureScope((scope) => {
      scope.setUser({ id: client.sessionId });
      scope.setTag('room_id', this.roomId);
      scope.setContext('game', {
        round: this.state.round,
        players: this.state.players.size,
      });
    });

    try {
      // 1. Call Matrix service
      const span = transaction.startChild({
        op: 'http.client',
        description: 'POST matrix/intelligence/respond',
      });

      // Sentry automatically injects trace headers!
      const response = await fetch(`${MATRIX_URL}/intelligence/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // These are added automatically by Sentry's fetch instrumentation:
          // 'sentry-trace': 'trace-id-parent-span-id-sampled'
          // 'baggage': 'sentry-environment=production,sentry-release=1.0.0'
        },
        body: JSON.stringify({
          roomId: this.roomId,
          round: this.state.round,
          context: this.getGameContext(),
        }),
      });

      span.finish();

      const effects = await response.json();

      // 2. Apply effects
      this.applyEffects(effects);

      transaction.setStatus('ok');
      return { success: true };

    } catch (error) {
      // Sentry captures error with full trace context
      Sentry.captureException(error);
      transaction.setStatus('internal_error');
      throw error;

    } finally {
      transaction.finish();
    }
  }
}

// ============================================================================
// MATRIX SERVICE (Python)
// ============================================================================

"""
# matrix/app.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Initialize Sentry with SAME DSN as Stein
sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/project-id",  # Same DSN!
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration()],
)

@app.post("/intelligence/respond")
async def respond(request: Request):
    # Sentry automatically:
    # 1. Reads 'sentry-trace' header from request
    # 2. Continues the transaction started in Stein
    # 3. This span is part of the SAME trace!

    with sentry_sdk.start_span(op="ai.generate", description="Generate AI response"):
        # Your AI logic
        result = await generate_ai_response(
            room_id=request.room_id,
            context=request.context,
        )

        # Track custom data
        sentry_sdk.set_context("ai_call", {
            "model": "gpt-4",
            "tokens": result.tokens_used,
            "latency_ms": result.latency,
        })

        return result
"""

// ============================================================================
// WHAT YOU SEE IN SENTRY DASHBOARD
// ============================================================================

/*
Trace ID: 8f9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c

[2500ms] advance_round (Stein)
│  roomId: "abc123"
│  round: 3
│  user: human_player
│
├─ [2400ms] POST matrix/intelligence/respond
│  │  status: 200
│  │  url: https://matrix.simulacra.cc/intelligence/respond
│  │
│  └─ [2350ms] Generate AI response (Matrix)    ← Same trace!
│     │  op: ai.generate
│     │  model: gpt-4
│     │  tokens: 450
│     │  latency_ms: 2300
│     │
│     └─ [2300ms] openai.chat.completions.create  ← Auto-instrumented
│        │  model: gpt-4
│        │  prompt_tokens: 1200
│        │  completion_tokens: 450

Click any span → See full context across both services
*/

// ============================================================================
// EXAMPLE: Tracking LLM Calls
// ============================================================================

export async function generateAIResponse(context: any) {
  // Create a span for the LLM call
  return await Sentry.startSpan(
    {
      op: 'ai.openai',
      description: 'Generate AI response',
    },
    async (span) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(context) },
        ],
      });

      // Add metadata to span
      span.setData('model', 'gpt-4');
      span.setData('prompt_tokens', response.usage?.prompt_tokens);
      span.setData('completion_tokens', response.usage?.completion_tokens);
      span.setData('total_cost', calculateCost(response.usage));

      return response;
    }
  );
}

// ============================================================================
// EVOLUTION: Add More Services
// ============================================================================

/*
When you add a 3rd service (e.g., Vector DB, Real-time data API):

1. Install Sentry in new service
2. Use same DSN
3. Traces automatically connect

Example: Stein → Matrix → Vector DB

[3000ms] advance_round (Stein)
└─ [2500ms] POST matrix/intelligence/respond
   └─ [2400ms] Generate AI response (Matrix)
      └─ [300ms] POST vectordb/search (Vector DB)  ← New service!
         └─ [280ms] similarity_search

All in ONE trace. Click any span, see full journey.
*/

// ============================================================================
// WHEN TO UPGRADE TO OPENTELEMETRY
// ============================================================================

/*
Upgrade when:
- 3+ services (Stein + Matrix + Vector DB + ...)
- Need auto-instrumentation for everything (DB queries, Redis, etc.)
- Want vendor flexibility (send traces to multiple backends)

Migration is easy:
1. Replace Sentry.init() with OTel SDK
2. Configure OTel exporter to send to Sentry
3. Sentry dashboard still works (ingests OTel data)
4. Bonus: Can also send to Prometheus, Grafana, etc.

See docs/OBSERVABILITY_EVOLUTION.md for migration guide
*/
