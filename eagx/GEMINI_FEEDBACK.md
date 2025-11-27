# EAGx Migration Plan - Gemini Technical Audit

**Reviewer:** Gemini (Antigravity)
**Date:** 2025-11-27
**Verdict:** **APPROVED with High-Risk Flag on AI Integration Layer**

---

## Executive Summary

The migration plan is solid, and the discovery of the existing Admin Dashboard significantly de-risks the timeline. However, there are specific technical risks regarding the **Gemini 2.0 + LiteLLM integration** and **Cloud Run networking** that require immediate attention to prevent blockers later in the sprint.

---

## 1. The "Hidden" Risk: LiteLLM + Gemini 2.0 Function Calling

**Risk Level:** High
**The Problem:** OpenAI and Google have different schemas for function calling. While LiteLLM handles translation, **Gemini 2.0 Flash Exp** is new. Edge cases like `strict` schema enforcement, nested JSON structures, or Parallel Tool Calling (returning chunks separately) can confuse the OpenAI Agents SDK.

### Mitigation Strategy
*   **Day 3 Validation:** Do not just test "chat". You must specifically test **nested object parameters** in tool calls to verify schema translation accuracy.
*   **Upgrade LiteLLM:** Ensure you are using the absolute latest version of LiteLLM to get the recent fixes for Gemini parallel tool calling.

### **Backup Plan [P2]: The "Complexity Ladder"**

If the OpenAI Agents SDK proves brittle or throws opaque schema errors, do not switch frameworks. Instead, drop down to "Rung 2" — the Direct LiteLLM Client. This removes the "Agent" abstraction and gives you full control over the schema.

**Rung 2 Implementation (Direct Client):**

```typescript
import { OpenAI } from "openai";

// 1. Setup Client (Same as before)
const client = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY, 
  baseURL: process.env.LITELLM_BASE_URL // e.g. https://asgard.bhishmaraj.org
});

// 2. Define Tools (Standard OpenAI Format)
const tools = [{
  type: "function",
  function: {
    name: "submit_action",
    description: "Submit a move for the player",
    parameters: {
      type: "object",
      properties: {
        actionType: { type: "string", enum: ["deploy", "attack"] },
        targetId: { type: "string" }
      },
      required: ["actionType", "targetId"]
    }
  }
}];

// 3. The "Raw" Loop (Replaces Agent SDK)
// This is 100% reliable because it's just raw JSON-in/JSON-out
async function runAgentTurn(history) {
  const response = await client.chat.completions.create({
    model: "gemini/gemini-2.0-flash-exp", // LiteLLM handles the routing
    messages: history,
    tools: tools,
    tool_choice: "auto"
  });

  const msg = response.choices[0].message;

  // 4. Handle Tool Call Manually
  if (msg.tool_calls) {
    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`Executing ${toolCall.function.name} with`, args);
      // Execute your logic here...
    }
  }
}
```

---

## 2. Cloud Run WebSocket "Silent Death"

**Risk Level:** Medium-High
**The Problem:** Cloud Run's default request timeout (5 mins) often applies to the *entire* WebSocket session, not just idle time. This will kill active games.

### Required Actions
1.  **Increase Timeout:** You **MUST** set the request timeout to `3600` (1 hour) or higher.
    *   Command: `gcloud run services update simulacra --timeout=3600`
2.  **Enable Session Affinity:** Even with `max-instances=1`, enable Session Affinity. If a deployment accidentally scales to 2, users will lose connections without this.

---

## 3. UX Polish: Optimistic UI

**Opportunity:** Low Effort / High Impact
**The Problem:** The flow `User Action -> Server -> AI -> Update` will introduce 2-4s latency, making the game feel sluggish.

### Recommendation
Use **Optimistic Updates**. When a user takes an action (e.g., "Deploy National Guard"), immediately reflect that state locally (e.g., gray out the card, show a "Deploying..." badge) before the server confirms. This masks the round-trip latency.

---

## 4. Security: Room Code Brute Force

**Risk Level:** Low (but real for public events)
**The Problem:** 6-character codes (e.g., `K7M2P9`) are easy to brute force. A script could join every active room.

### Mitigation
Implement a simple **Rate Limit** on the `/join` endpoint (e.g., 5 attempts per minute per IP) using `express-rate-limit`.

---

## Revised Timeline Recommendation ("Fail Fast")

Swap the order of operations to tackle the biggest unknowns first:

1.  **Day 1:** **Cloud Run WebSocket Smoke Test** (Moved from Day 12).
    *   *Reason:* If Cloud Run networking fails, you need weeks, not days, to fix it.
2.  **Day 2:** **Gemini Tool Calling Spike**.
    *   *Reason:* Verify LiteLLM + Gemini 2.0 works for *complex* tools immediately.
3.  **Day 3-6:** Core Game Loop (as planned).

---

## Configuration Cheat Sheet

**Recommended `colyseus.config.ts` for Cloud Run:**

```typescript
import { WebSocketTransport } from "@colyseus/ws-transport";

export default {
  // ...
  transport: new WebSocketTransport({
    pingInterval: 5000, // Keep connection alive aggressively
    pingMaxRetries: 3,
    server: server, // Your express server
  }),
  // ...
}
```
