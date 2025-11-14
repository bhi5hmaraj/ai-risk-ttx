# Firebase Remote Config Setup Guide

**10-minute setup for runtime config injection on Cloud Run**

---

## Why Firebase Remote Config?

- ✅ **Free** - Unlimited reads, unlimited parameters
- ✅ **Real-time** - Changes live in seconds
- ✅ **Versioning** - Automatic version history + rollback
- ✅ **A/B testing** - Built-in experimentation
- ✅ **Cloud Run native** - Perfect integration
- ✅ **No vendor lock-in** - Can export to JSON

---

## Step 1: Enable Firebase (2 minutes)

### Option A: Existing Firebase Project

If you already use Firebase:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Remote Config" in left sidebar
4. Skip to Step 2

### Option B: New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter your **Google Cloud Project ID** (same as Cloud Run project)
4. Enable Google Analytics (optional)
5. Click "Remote Config" in left sidebar

---

## Step 2: Install Dependencies (1 minute)

```bash
npm install firebase-admin node-cache
```

---

## Step 3: Add Config Parameters (5 minutes)

In Firebase Console → Remote Config:

### 3.1 Add Prompt Configurations

Click "Add parameter" for each prompt type:

#### Parameter: `prompts_action_generation`

**Value (JSON):**
```json
{
  "version": "v1-baseline",
  "system": "You are a Game Master for an AI crisis simulation. Generate 5 diverse action options for the player's role. Each action should have a clear cost (1-3 action points), a meaningful impact on the crisis, and potential consequences. Make actions strategically interesting with trade-offs between short-term and long-term goals.",
  "temperature": 0.8,
  "maxTokens": 1000,
  "notes": "Baseline prompt with strategic depth"
}
```

#### Parameter: `prompts_consequences`

**Value (JSON):**
```json
{
  "version": "v1-timeline",
  "system": "You are a Game Master. Generate consequences with 3-5 chronological beats showing how events unfold based on player actions. Use a timeline format: [TIME] Event description. Show cascading effects, unexpected outcomes, and how different players' actions interact. Update the public score (Democratic Legitimacy) based on collective impact.",
  "temperature": 0.7,
  "maxTokens": 1200,
  "notes": "Timeline-focused storytelling"
}
```

#### Parameter: `prompts_ai_player`

**Value (JSON):**
```json
{
  "version": "v1-strategic",
  "system": "You are an AI player with a hidden objective. Choose actions that advance your secret goal while maintaining plausible deniability. Balance obvious moves with subtle long-term positioning. Don't reveal your true objective through overly aggressive actions.",
  "temperature": 0.9,
  "maxTokens": 600,
  "notes": "Strategic AI player with hidden goals"
}
```

#### Parameter: `prompts_counterfactual`

**Value (JSON):**
```json
{
  "version": "v1-baseline",
  "system": "Generate the baseline outcome if no players take action this round. Show how the crisis naturally evolves without intervention. This provides a comparison point for measuring player impact.",
  "temperature": 0.7,
  "maxTokens": 800,
  "notes": "Inaction baseline for comparison"
}
```

### 3.2 Add LLM Configuration

#### Parameter: `llm_config`

**Value (JSON):**
```json
{
  "model": "gemini-2.5-flash",
  "fallbackModel": "gpt-4o-mini",
  "timeoutMs": 30000,
  "maxRetries": 2
}
```

### 3.3 Add Feature Flags

#### Parameter: `feature_use_colyseus`

**Value:** `true` (String type)

#### Parameter: `feature_enable_chat`

**Value:** `false` (String type)

#### Parameter: `feature_enable_spectators`

**Value:** `false` (String type)

#### Parameter: `feature_rollout_new_ui`

**Value:** `0` (Number type, 0-100 for percentage rollout)

### 3.4 Publish Configuration

Click **"Publish changes"** in top-right corner.

Changes are live globally in < 5 seconds.

---

## Step 4: Configure Cloud Run (2 minutes)

Add environment variable to Cloud Run:

```bash
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=your-project-id"
```

Or in `vercel.json` / Cloud Run YAML:

```yaml
env:
  - name: GOOGLE_CLOUD_PROJECT
    value: "your-project-id"
```

**That's it!** Your Cloud Run service now has read access to Firebase Remote Config.

---

## Step 5: Test Locally (2 minutes)

### 5.1 Authenticate with GCP

```bash
gcloud auth application-default login
```

### 5.2 Set Environment Variable

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
```

### 5.3 Test Config Fetch

```typescript
// test-config.ts
import { getAppConfig } from './lib/remote-config';

async function test() {
  const config = await getAppConfig();
  console.log('Config loaded:', config);
}

test();
```

```bash
npx ts-node test-config.ts
```

**Expected output:**
```
[RemoteConfig] Preloading configuration...
[RemoteConfig] Configuration preloaded successfully
Config loaded: {
  prompts: {
    actionGeneration: { version: 'v1-baseline', ... },
    consequences: { version: 'v1-timeline', ... },
    ...
  },
  llm: { model: 'gemini-2.5-flash', ... },
  features: { useColyseus: true, ... }
}
```

---

## Usage Examples

### In Colyseus GameRoom

```typescript
import { getAppConfig } from '../lib/remote-config';

export class GameRoom extends Room {
  private config!: AppConfig;

  async onCreate(options: any) {
    // Inject config at room creation
    this.config = await getAppConfig();

    console.log('Using prompts:', {
      actionGeneration: this.config.prompts.actionGeneration.version,
      consequences: this.config.prompts.consequences.version,
    });
  }

  async generateActionOptions() {
    const { system, temperature, maxTokens } =
      this.config.prompts.actionGeneration;

    return await callLLM({ system, temperature, maxTokens });
  }
}
```

### In Server Startup

```typescript
import { preloadConfig } from './lib/remote-config';

async function startServer() {
  // Preload config to warm cache
  await preloadConfig();

  // Start server
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  gameServer.define('game', GameRoom);
}

startServer();
```

---

## Updating Configuration

### Via Firebase Console (Recommended)

1. Go to Firebase Console → Remote Config
2. Edit parameter (e.g., `prompts_action_generation`)
3. Change version, prompt text, temperature, etc.
4. Click "Publish changes"
5. **Live in < 5 seconds** (cache refreshes in 1 minute)

**Example: Update prompt to v2**

Change `prompts_action_generation` to:
```json
{
  "version": "v2-moral-dilemmas",
  "system": "You are a Game Master. Generate 5 action options that emphasize ethical dilemmas and moral trade-offs. Each action should force the player to choose between competing values (liberty vs security, transparency vs stability, etc.).",
  "temperature": 0.85,
  "maxTokens": 1200,
  "notes": "Moral dilemma focus for IRL event"
}
```

Click "Publish" → All new game rooms use v2 prompt automatically.

### Via Admin API (Future)

```typescript
import { updateRemoteConfig } from './lib/remote-config';

// In your admin API endpoint
await updateRemoteConfig('prompts_action_generation', {
  version: 'v3-experimental',
  system: '...',
  temperature: 0.9,
  maxTokens: 1000,
});
```

---

## Version History & Rollback

Firebase automatically tracks version history.

### View History

1. Firebase Console → Remote Config
2. Click "History" tab
3. See all published versions with timestamps

### Rollback to Previous Version

1. Click "History" tab
2. Find previous version
3. Click "..." → "Rollback to this version"
4. Confirm
5. **Live in < 5 seconds**

---

## A/B Testing (Advanced)

Firebase Remote Config supports conditions for A/B testing.

### Example: 10% of users get new prompt

1. Firebase Console → Remote Config
2. Click `prompts_action_generation`
3. Click "Add value for condition"
4. Create condition: "Random percentile <= 10%"
5. Set conditional value to v2 prompt
6. Set default value to v1 prompt
7. Publish

Now 10% of users get v2, 90% get v1.

### In Code

```typescript
// No code changes needed! Firebase handles it server-side based on user ID
const config = await getPromptConfig('action_generation');
// User A gets v1, User B gets v2 (randomly)
```

---

## Monitoring

### Firebase Console Dashboard

- **Parameter usage** - How many times each parameter was fetched
- **Active users** - How many unique users accessed config
- **A/B test results** - Conversion metrics (if set up)

### Custom Logging

```typescript
import { getPromptConfig } from './lib/remote-config';
import * as Sentry from '@sentry/node';

const config = await getPromptConfig('action_generation');

Sentry.setContext('prompt_config', {
  version: config.version,
  temperature: config.temperature,
});

console.log('[GameRoom] Using prompt:', config.version);
```

---

## Cost

**Firebase Remote Config pricing:**
- ✅ **Free tier** - Unlimited reads, unlimited parameters
- ✅ **No usage limits** for Remote Config
- ✅ **No credit card required**

*Source: [Firebase Pricing](https://firebase.google.com/pricing)*

---

## Troubleshooting

### "Failed to fetch config"

**Problem:** `getAppConfig()` returns null or throws error

**Solutions:**
1. Check `GOOGLE_CLOUD_PROJECT` env var is set
2. Verify Firebase project ID matches GCP project ID
3. Run `gcloud auth application-default login` locally
4. Check Cloud Run service account has `firebaseremoteconfig.configs.get` permission

### "Using default config"

**Problem:** Fallback to default prompts instead of remote config

**Solutions:**
1. Verify parameters exist in Firebase Console
2. Check parameter names match exactly (e.g., `prompts_action_generation`)
3. Verify JSON is valid (use JSON validator)
4. Check Firebase Console → History → Ensure config is published

### Cache not updating

**Problem:** Changes in Firebase not reflected in app

**Solutions:**
1. Wait 60 seconds (cache TTL)
2. Restart Cloud Run service to clear cache
3. Call `clearConfigCache()` in dev environment

---

## Migration from Env Vars

### Before (Env Vars)

```typescript
const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
const promptVariant = process.env.PROMPT_VARIANT || 'v1';
```

### After (Firebase Remote Config)

```typescript
import { getPromptConfig, getLLMConfig } from './lib/remote-config';

const promptConfig = await getPromptConfig('action_generation');
const temperature = promptConfig.temperature;
const variant = promptConfig.version;
```

**Advantages:**
- ✅ No redeploy needed to change config
- ✅ Version history + rollback
- ✅ A/B testing support
- ✅ Centralized dashboard

---

## Next Steps

1. ✅ Set up Firebase Remote Config (10 min)
2. ✅ Migrate prompts from env vars / files
3. ✅ Deploy to Cloud Run
4. 🔲 Build admin UI for prompt management (optional)
5. 🔲 Set up A/B tests for prompt variants (after IRL event)

---

## Security Considerations

**Read Access:**
- ✅ Cloud Run service account has read access by default
- ✅ Firebase Remote Config is read-only from client/server
- ✅ No secrets in Remote Config (use Secret Manager for API keys)

**Write Access:**
- ⚠️ Only Firebase Console admins can update config
- ⚠️ Use Vercel API tokens for programmatic updates (admin API)
- ⚠️ Add authentication to admin endpoints

**Best Practices:**
- Store prompts, feature flags, LLM config in Remote Config
- Store secrets (API keys, DB passwords) in GCP Secret Manager
- Never commit Remote Config to git (it's in Firebase cloud)

---

**Last Updated:** 2025-11-14
**Next:** Deploy to Cloud Run, test config updates
