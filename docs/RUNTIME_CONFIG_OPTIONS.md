# Runtime Configuration for Cloud Run

**Requirement:** Cloud-agnostic config injection that works with Cloud Run

---

## Option 1: Firebase Remote Config (Recommended)

**Why it's perfect:**
- ✅ **Made by Google** - First-class Cloud Run support
- ✅ **Free tier** - Unlimited config reads
- ✅ **Real-time updates** - Changes live in seconds
- ✅ **A/B testing** - Built-in experimentation
- ✅ **Simple SDK** - One line to fetch config
- ✅ **Type-safe** - TypeScript support
- ✅ **Admin UI** - Firebase console is excellent
- ✅ **Versioning** - Automatic version history
- ✅ **Rollback** - One-click revert to previous version

**Perfect for:**
- Prompts (store full prompt text)
- Feature flags (binary and percentage rollouts)
- LLM config (model names, temperatures, etc.)
- Any runtime config you want to change without redeployment

**Setup: 10 minutes**

```bash
# Install Firebase Admin SDK
npm install firebase-admin
```

**Usage:**

```typescript
// lib/config.ts
import admin from 'firebase-admin';

// Initialize (one-time)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const remoteConfig = admin.remoteConfig();

// Fetch config template
export async function getConfig() {
  const template = await remoteConfig.getTemplate();
  return template.parameters;
}

// Get single value
export async function getConfigValue(key: string): Promise<any> {
  const template = await remoteConfig.getTemplate();
  const param = template.parameters[key];
  return param?.defaultValue?.value || null;
}
```

**In your GameRoom:**

```typescript
import { getConfigValue } from '../lib/config';

export class GameRoom extends Room {
  async onCreate() {
    // Fetch latest prompt config
    const promptConfig = await getConfigValue('prompts_action_generation');

    this.promptConfig = JSON.parse(promptConfig);
    console.log('Using prompt version:', this.promptConfig.version);
  }

  async generateActionOptions() {
    // Use injected config
    return await callLLM({
      systemPrompt: this.promptConfig.system,
      temperature: this.promptConfig.temperature,
      maxTokens: this.promptConfig.maxTokens,
    });
  }
}
```

**Firebase Console UI:**

1. Go to Firebase Console → Remote Config
2. Add parameter: `prompts_action_generation`
3. Set value (JSON):
```json
{
  "version": "v3-moral-dilemmas",
  "system": "You are a Game Master...",
  "temperature": 0.8,
  "maxTokens": 1000,
  "notes": "Emphasizes ethical trade-offs"
}
```
4. Click "Publish" → Live globally in seconds

**Caching (Important for Performance):**

```typescript
import NodeCache from 'node-cache';

const configCache = new NodeCache({ stdTTL: 60 }); // 1 minute cache

export async function getCachedConfig(key: string) {
  let value = configCache.get(key);

  if (!value) {
    value = await getConfigValue(key);
    configCache.set(key, value);
  }

  return value;
}
```

**Cost:** FREE (unlimited reads, unlimited parameters)

---

## Option 2: ConfigCat (Cloud-Agnostic SaaS)

**Why it's good:**
- ✅ **Cloud-agnostic** - Works anywhere (Cloud Run, Vercel, AWS, etc.)
- ✅ **Free tier** - 1000 config reads/day (plenty for MVP)
- ✅ **Simple SDK** - npm install + 3 lines of code
- ✅ **A/B testing** - Percentage rollouts
- ✅ **Targeting** - User-specific config (premium users, beta testers)
- ✅ **Webhooks** - Get notified on config changes
- ✅ **Admin UI** - Excellent dashboard

**Setup: 5 minutes**

```bash
npm install configcat-node
```

**Usage:**

```typescript
// lib/config.ts
import * as configcat from 'configcat-node';

const client = configcat.getClient(
  process.env.CONFIGCAT_SDK_KEY!,
  configcat.PollingMode.AutoPoll
);

export async function getFeatureFlag(key: string, defaultValue: boolean = false) {
  return await client.getValueAsync(key, defaultValue);
}

export async function getConfigValue(key: string, defaultValue: any = null) {
  return await client.getValueAsync(key, defaultValue);
}
```

**In your GameRoom:**

```typescript
import { getConfigValue } from '../lib/config';

export class GameRoom extends Room {
  async onCreate() {
    // Fetch config
    const promptVariant = await getConfigValue('prompt_variant_action_generation', 'v1');
    const useNewUI = await getConfigValue('feature_new_ui', false);

    console.log('Using prompt:', promptVariant, 'New UI:', useNewUI);
  }
}
```

**ConfigCat Dashboard:**

1. Create setting: `prompts_action_generation`
2. Type: JSON
3. Value:
```json
{
  "version": "v3",
  "system": "...",
  "temperature": 0.8
}
```
4. Save → Live in 60 seconds (auto-poll default)

**Cost:**
- Free: 1000 config fetches/day
- Pro: $25/month (100K fetches/day)

---

## Option 3: Google Cloud Firestore (DIY with Database)

**Why consider:**
- ✅ **Flexible** - Store any data structure
- ✅ **Real-time** - Firestore supports live updates
- ✅ **Free tier** - 50K reads/day
- ✅ **Already know Prisma** - Similar patterns

**But:**
- ⚠️ More code to write (not a library)
- ⚠️ Need to build admin UI yourself
- ⚠️ No built-in A/B testing
- ⚠️ No version history (unless you build it)

**Setup:**

```bash
npm install @google-cloud/firestore
```

**Usage:**

```typescript
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

export async function getConfig(key: string) {
  const doc = await db.collection('config').doc(key).get();
  return doc.data();
}

export async function setConfig(key: string, value: any) {
  await db.collection('config').doc(key).set(value);
}
```

**Admin UI:** You'd need to build this yourself (Next.js admin pages)

**Cost:** FREE for MVP usage (50K reads/day)

---

## Recommendation

### For MVP (Week 1-3): **Firebase Remote Config**

**Why:**
1. **Free** - No limits
2. **Google Cloud native** - Perfect for Cloud Run
3. **Battle-tested** - Used by millions of apps
4. **Simple** - 10-minute setup
5. **Great UI** - Firebase console is excellent
6. **Version control** - Built-in history + rollback
7. **No vendor lock-in** - Can export config to JSON

**Setup checklist:**

```bash
# 1. Install
npm install firebase-admin

# 2. Enable Firebase in GCP project
# (Already enabled if you use Firebase, otherwise enable in console)

# 3. Add to .env
GOOGLE_CLOUD_PROJECT=your-project-id

# 4. Deploy
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=your-project-id"

# Done! Use Firebase console to manage config
```

---

## Migration Path

### Today: Env Vars

```typescript
const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
```

### Tomorrow: Firebase Remote Config

```typescript
import { getCachedConfig } from './lib/config';

const promptConfig = await getCachedConfig('prompts_action_generation');
const temperature = promptConfig.temperature;
```

**Same call sites, just swap the implementation.**

---

## What About Session Replay?

For session replay (your earlier requirement), you still want **Prisma + PostgreSQL** to store:
- Game sessions
- Events log
- Player actions

But for **runtime config** (prompts, feature flags), use **Firebase Remote Config**.

**Separation of concerns:**
- **Firebase Remote Config** - Runtime config (prompts, flags, LLM settings)
- **PostgreSQL + Prisma** - Persistent data (sessions, feedback, users)

---

## Example: Full Integration

```typescript
// lib/config.ts
import admin from 'firebase-admin';
import NodeCache from 'node-cache';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const remoteConfig = admin.remoteConfig();
const cache = new NodeCache({ stdTTL: 60 });

export async function getPromptConfig(category: string) {
  const cacheKey = `prompts_${category}`;

  let config = cache.get(cacheKey);
  if (config) return config;

  const template = await remoteConfig.getTemplate();
  const param = template.parameters[cacheKey];

  if (param?.defaultValue?.value) {
    config = JSON.parse(param.defaultValue.value);
    cache.set(cacheKey, config);
  }

  return config || DEFAULT_PROMPTS[category];
}

export async function getFeatureFlag(flag: string): Promise<boolean> {
  const cacheKey = `feature_${flag}`;

  let value = cache.get(cacheKey);
  if (value !== undefined) return value;

  const template = await remoteConfig.getTemplate();
  const param = template.parameters[cacheKey];

  value = param?.defaultValue?.value === 'true';
  cache.set(cacheKey, value);

  return value;
}
```

**In GameRoom:**

```typescript
import { getPromptConfig, getFeatureFlag } from '../lib/config';

export class GameRoom extends Room {
  async onCreate() {
    // Inject all config at room creation
    this.config = {
      prompts: {
        actionGeneration: await getPromptConfig('action_generation'),
        consequences: await getPromptConfig('consequences'),
        aiPlayer: await getPromptConfig('ai_player'),
      },
      features: {
        useColyseus: await getFeatureFlag('use_colyseus'),
        enableChat: await getFeatureFlag('enable_chat'),
      },
    };

    console.log('Room initialized with config:', this.config);
  }

  async generateActionOptions() {
    const { system, temperature, maxTokens } = this.config.prompts.actionGeneration;

    return await callLLM({ system, temperature, maxTokens });
  }
}
```

**Firebase Console:**

Add these parameters:
- `prompts_action_generation` (JSON)
- `prompts_consequences` (JSON)
- `prompts_ai_player` (JSON)
- `feature_use_colyseus` (String: "true" or "false")
- `feature_enable_chat` (String: "true" or "false")

Click "Publish" → Live instantly.

---

## Summary

| Feature | Firebase Remote Config | ConfigCat | Firestore |
|---------|----------------------|-----------|-----------|
| **Setup Time** | 10 min | 5 min | 30 min |
| **Cost (MVP)** | FREE | FREE | FREE |
| **Cloud Run** | ✅ Native | ✅ Works | ✅ Native |
| **Admin UI** | ✅ Excellent | ✅ Great | ❌ Build yourself |
| **Versioning** | ✅ Built-in | ✅ Built-in | ❌ DIY |
| **A/B Testing** | ✅ Yes | ✅ Yes | ❌ No |
| **Type Safety** | ✅ TypeScript | ✅ TypeScript | ✅ TypeScript |
| **Vendor Lock-in** | ⚠️ Google | ⚠️ ConfigCat | ⚠️ Google |

**Recommendation: Firebase Remote Config** for Cloud Run deployment.

---

**Last Updated:** 2025-11-14
**Next:** Set up Firebase Remote Config, migrate prompts from env vars
