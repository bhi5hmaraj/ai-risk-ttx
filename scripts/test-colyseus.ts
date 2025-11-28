import { Client } from "colyseus.js";

const COLYSEUS_URL = process.env.TEST_COLYSEUS_URL || process.env.NEXT_PUBLIC_COLYSEUS_URL;
if (!COLYSEUS_URL) {
  throw new Error('Set TEST_COLYSEUS_URL or NEXT_PUBLIC_COLYSEUS_URL to run scripts/test-colyseus.ts');
}

// Generate unique traceId for this test session
function generateTraceId() {
    return 'trace-' + Math.random().toString(36).substring(2, 15);
}

async function test() {
    const traceId = generateTraceId();
    console.log(`[${traceId}] Starting Colyseus test...`);
    console.log(`[${traceId}] Connecting to: ${COLYSEUS_URL}`);

    const client = new Client(COLYSEUS_URL);

    try {
        console.log(`[${traceId}] Joining room...`);
        const room = await client.joinOrCreate("game", {
            traceId,
            name: "TestPlayer",
            role: "Tester",
            isHuman: true,
        });

        console.log(`[${traceId}] Joined successfully!`, room.sessionId);

        // Wait for initial state to be synchronized
        await new Promise((resolve) => {
            room.onStateChange.once(resolve);
        });

        // Log initial game state
        console.log(`[${traceId}] Game phase:`, room.state.phase);
        console.log(`[${traceId}] Round:`, room.state.round);
        console.log(`[${traceId}] Public score:`, room.state.publicScore);
        console.log(`[${traceId}] Core metric:`, room.state.coreMetricName);

        // Log players (already exists from onJoin)
        console.log(`[${traceId}] My player:`, {
            name: room.state.players.get(room.sessionId)?.name,
            role: room.state.players.get(room.sessionId)?.role,
            actionPoints: room.state.players.get(room.sessionId)?.actionPoints,
            hasSubmitted: room.state.players.get(room.sessionId)?.hasSubmitted,
        });

        // Test 1: Set Role
        console.log(`[${traceId}] Setting role...`);
        room.send("set_role", { role: "Senator", name: "Alice" });

        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 500));

        const myPlayer = room.state.players.get(room.sessionId);
        console.log(`[${traceId}] Role updated:`, {
            name: myPlayer?.name,
            role: myPlayer?.role
        });

        // Test 2: Submit Action
        console.log(`[${traceId}] Submitting action...`);
        room.send("submit_action", { actionId: "action_1", cost: 1 });

        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 500));

        const myPlayerAfter = room.state.players.get(room.sessionId);
        console.log(`[${traceId}] Action submitted:`, {
            hasSubmitted: myPlayerAfter?.hasSubmitted,
            actionPoints: myPlayerAfter?.actionPoints
        });

        // Test 3: Start Game
        console.log(`[${traceId}] Starting game...`);
        room.send("start_game", {});

        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[${traceId}] Game phase:`, room.state.phase);

        // Test 4: Advance Round
        console.log(`[${traceId}] Advancing round...`);
        room.send("advance_round", {});

        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[${traceId}] Round:`, room.state.round);
        const myPlayerRound2 = room.state.players.get(room.sessionId);
        console.log(`[${traceId}] AP after round:`, myPlayerRound2?.actionPoints);

        console.log(`[${traceId}] Sending ping...`);
        room.send("ping", { test: "hello" });

        room.onMessage("pong", (message) => {
            console.log(`[${traceId}] Received pong:`, message);
            room.leave();
            process.exit(0);
        });
    } catch (e) {
        console.error(`[${traceId}] Error:`, e);
        process.exit(1);
    }
}

test();
