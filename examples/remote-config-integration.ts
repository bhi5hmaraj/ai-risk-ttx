/**
 * Firebase Remote Config Integration Examples
 *
 * Shows how to use remote config in Colyseus GameRoom
 */

import { Room, Client } from '@colyseus/core';
import { getAppConfig, getPromptConfig, getFeatureFlag } from '../lib/remote-config';
import type { AppConfig } from '../lib/remote-config';

// ============================================================================
// PATTERN 1: INJECT AT ROOM CREATION
// ============================================================================

export class GameRoom extends Room {
  private config!: AppConfig;

  async onCreate(options: any) {
    // Inject config once at room creation
    this.config = await getAppConfig();

    console.log('[GameRoom] Initialized with config:', {
      promptVersions: {
        actionGeneration: this.config.prompts.actionGeneration.version,
        consequences: this.config.prompts.consequences.version,
      },
      llmModel: this.config.llm.model,
      features: this.config.features,
    });

    // Use config to set up room
    if (this.config.features.enableChat) {
      this.setupChatHandlers();
    }

    if (this.config.features.enableSpectators) {
      this.allowSpectators();
    }
  }

  async onMessage(client: Client, type: string, message: any) {
    if (type === 'get_action_options') {
      await this.handleActionOptions(client, message);
    }
  }

  private async handleActionOptions(client: Client, message: any) {
    const { system, temperature, maxTokens } = this.config.prompts.actionGeneration;

    // Use injected prompt config
    const options = await generateActionOptions({
      systemPrompt: system,
      temperature,
      maxTokens,
      context: this.getGameContext(),
    });

    client.send('action_options', options);
  }
}

// ============================================================================
// PATTERN 2: LAZY LOADING (Fetch on Demand)
// ============================================================================

export class LazyConfigGameRoom extends Room {
  async onCreate(options: any) {
    // Don't preload config, fetch as needed
    console.log('[GameRoom] Created, will fetch config on demand');
  }

  async onMessage(client: Client, type: string, message: any) {
    if (type === 'get_action_options') {
      // Fetch config on demand (cached for 1 minute)
      const promptConfig = await getPromptConfig('action_generation');

      const options = await generateActionOptions({
        systemPrompt: promptConfig.system,
        temperature: promptConfig.temperature,
        maxTokens: promptConfig.maxTokens,
        context: this.getGameContext(),
      });

      client.send('action_options', options);
    }
  }
}

// ============================================================================
// PATTERN 3: USER-SPECIFIC CONFIG (A/B Testing)
// ============================================================================

export class ABTestGameRoom extends Room {
  async onCreate(options: any) {
    const userId = options.userId;

    // Check if user is in new UI rollout
    const useNewUI = await getFeatureFlag('rollout_new_ui', userId);

    if (useNewUI) {
      console.log(`[GameRoom] User ${userId} is in new UI rollout`);
      this.state.uiVersion = 'v2';
    } else {
      this.state.uiVersion = 'v1';
    }

    // Send UI config to client
    this.broadcast('ui_config', { version: this.state.uiVersion });
  }
}

// ============================================================================
// PATTERN 4: FEATURE FLAG GATING
// ============================================================================

export class FeatureGatedRoom extends Room {
  async onCreate(options: any) {
    // Check feature flags
    const enableChat = await getFeatureFlag('enable_chat');
    const enableSpectators = await getFeatureFlag('enable_spectators');

    if (enableChat) {
      this.onMessage('chat_message', (client, message) => {
        this.broadcast('chat_message', {
          from: client.sessionId,
          text: message.text,
        });
      });
    }

    if (enableSpectators) {
      this.maxClients = 10; // Allow spectators
    } else {
      this.maxClients = 6; // Players only
    }
  }
}

// ============================================================================
// PATTERN 5: MULTIPLE PROMPT VARIANTS (Experimentation)
// ============================================================================

export class MultiVariantRoom extends Room {
  private promptConfigs: Map<string, any> = new Map();

  async onCreate(options: any) {
    // Preload all prompt variants
    this.promptConfigs.set(
      'action_generation',
      await getPromptConfig('action_generation')
    );
    this.promptConfigs.set(
      'consequences',
      await getPromptConfig('consequences')
    );
    this.promptConfigs.set(
      'ai_player',
      await getPromptConfig('ai_player')
    );

    console.log('[GameRoom] Loaded prompt variants:', {
      actionGeneration: this.promptConfigs.get('action_generation').version,
      consequences: this.promptConfigs.get('consequences').version,
      aiPlayer: this.promptConfigs.get('ai_player').version,
    });
  }

  async generateActionOptions() {
    const config = this.promptConfigs.get('action_generation');
    return await callLLM(config);
  }

  async generateConsequences() {
    const config = this.promptConfigs.get('consequences');
    return await callLLM(config);
  }

  async generateAIPlayerAction() {
    const config = this.promptConfigs.get('ai_player');
    return await callLLM(config);
  }
}

// ============================================================================
// USAGE IN SERVER STARTUP (server.ts)
// ============================================================================

/*
import { preloadConfig } from './lib/remote-config';

async function startServer() {
  // Preload config at startup (warm cache)
  await preloadConfig();

  // Start Colyseus server
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  gameServer.define('game', GameRoom);

  console.log('Server started with preloaded config');
}

startServer();
*/

// ============================================================================
// ADMIN API ENDPOINTS (Next.js API routes)
// ============================================================================

/*
// api/admin/config/list.ts
import { listRemoteConfig } from '../../../lib/remote-config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Add auth middleware
  const config = await listRemoteConfig();
  res.json(config);
}
*/

/*
// api/admin/config/update.ts
import { updateRemoteConfig } from '../../../lib/remote-config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Add auth middleware

  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).json({ error: 'Missing key or value' });
  }

  await updateRemoteConfig(key, value);

  res.json({ success: true, key, value });
}
*/

// ============================================================================
// DUMMY IMPLEMENTATIONS (Replace with real services)
// ============================================================================

async function generateActionOptions(params: any) {
  // TODO: Replace with real LLM call
  return [
    { title: 'Action 1', description: '...', cost: 1 },
    { title: 'Action 2', description: '...', cost: 2 },
  ];
}

async function callLLM(config: any) {
  // TODO: Replace with real LLM service
  console.log('Calling LLM with config:', config.version);
  return { result: 'dummy' };
}
