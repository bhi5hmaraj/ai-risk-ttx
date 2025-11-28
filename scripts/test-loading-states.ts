/**
 * Test script for Phase 2 loading states feature
 *
 * Tests:
 * 1. Connect to Colyseus server
 * 2. Start game (triggers LLM scenario generation)
 * 3. Verify action_options message is received
 * 4. Verify loading states are set correctly
 */

import { Client } from 'colyseus.js';

const COLYSEUS_URL = process.env.TEST_COLYSEUS_URL || process.env.NEXT_PUBLIC_COLYSEUS_URL;
if (!COLYSEUS_URL) {
  throw new Error('Set TEST_COLYSEUS_URL or NEXT_PUBLIC_COLYSEUS_URL to run scripts/test-loading-states.ts');
}

async function testLoadingStates() {
  console.log('🧪 Testing Phase 2 Loading States Feature\n');

  const client = new Client(COLYSEUS_URL);

  try {
    // Step 1: Connect to game room
    console.log('1️⃣ Connecting to Colyseus server...');
    const room = await client.joinOrCreate('game', {
      name: 'TestPlayer',
      role: 'Election Commissioner',
      isHuman: true,
    });

    console.log(`✅ Connected! Room ID: ${room.roomId}, Session ID: ${room.sessionId}\n`);

    // Step 2: Listen for game_started event (should trigger isGeneratingOptions = true)
    room.onMessage('game_started', () => {
      console.log('2️⃣ game_started event received');
      console.log('   ➡️ Client should now set isGeneratingOptions = true');
      console.log('   ➡️ LoadingScreen should show "Generating action options..."\n');
    });

    // Step 3: Listen for action_options event (should set isGeneratingOptions = false)
    room.onMessage('action_options', (message: any) => {
      console.log('3️⃣ action_options event received');
      console.log(`   ➡️ Player: ${message.playerId}`);
      console.log(`   ➡️ Round: ${message.round}`);
      console.log(`   ➡️ Options count: ${message.options?.length || 0}`);
      console.log('   ➡️ Client should now set isGeneratingOptions = false');
      console.log('   ➡️ LoadingScreen should hide, GameScreen should show\n');

      // Test passed!
      console.log('✅ Test PASSED - All events received correctly\n');
      console.log('Next steps:');
      console.log('1. Test in browser UI to verify LoadingScreen appears');
      console.log('2. Verify "Generating action options..." message shows');
      console.log('3. Verify screen transitions to GameScreen when options arrive');

      // Cleanup
      setTimeout(() => {
        room.leave();
        process.exit(0);
      }, 1000);
    });

    // Step 4: Listen for errors
    room.onError((code, message) => {
      console.error(`❌ Room error: [${code}] ${message}`);
      process.exit(1);
    });

    // Step 5: Start the game
    console.log('4️⃣ Sending start_game message...');
    room.send('start_game', {});
    console.log('   ⏳ Waiting for LLM to generate initial scenario...');
    console.log('   (This may take 5-30 seconds)\n');

  } catch (error) {
    console.error('❌ Test FAILED:', error);
    process.exit(1);
  }
}

// Run test with timeout
const timeout = setTimeout(() => {
  console.error('❌ Test TIMEOUT - No response after 60 seconds');
  process.exit(1);
}, 60000);

testLoadingStates();
