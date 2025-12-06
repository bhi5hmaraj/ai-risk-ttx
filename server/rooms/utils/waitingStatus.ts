import type { GameState } from "../schema/GameState";

export interface WaitingStatusPayload {
  round: number;
  phase: string;
  humans: { id: string; name: string; role: string; submitted: boolean }[];
  ai: { id: string; role: string; done: boolean }[];
  humansReady: number;
  humansTotal: number;
  allHumansReady: boolean;
  allReady: boolean;
}

export function computeWaitingStatus(state: GameState): WaitingStatusPayload {
  const humans: WaitingStatusPayload["humans"] = [];
  const ai: WaitingStatusPayload["ai"] = [];

  state.players.forEach((p) => {
    if (p.isHuman) {
      humans.push({ id: p.sessionId, name: p.name, role: p.role, submitted: !!p.hasSubmitted });
    } else {
      ai.push({ id: p.sessionId, role: p.role, done: !!p.hasSubmitted });
    }
  });

  const humansTotal = humans.length;
  const humansReady = humans.filter((h) => h.submitted).length;
  const allHumansReady = humansTotal > 0 && humansReady === humansTotal;
  const allAIDone = ai.every((a) => a.done);
  const allReady = allHumansReady && allAIDone;

  return {
    round: state.round,
    phase: state.phase,
    humans,
    ai,
    humansReady,
    humansTotal,
    allHumansReady,
    allReady,
  };
}

