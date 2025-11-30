import { create } from 'zustand';

type SessionMeta = { id: string; revision: number; hostToken: string } | null;

type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SSEStatus {
  state: SSEConnectionState;
  lastEventTime: number | null;
  lastEventType: string | null;
  error: string | null;
}

interface SessionStore {
  sessionMeta: SessionMeta;
  hasStartIntent: boolean;
  sseStatus: SSEStatus;
  colyseusSessionId: string | null;
  setSessionMeta: (meta: SessionMeta) => void;
  setStartIntent: (v: boolean) => void;
  setSSEState: (state: SSEConnectionState, error?: string) => void;
  setSSEEvent: (eventType: string) => void;
  setColyseusSessionId: (id: string | null) => void;
  clear: () => void;
}

const initialSSEStatus: SSEStatus = {
  state: 'disconnected',
  lastEventTime: null,
  lastEventType: null,
  error: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionMeta: null,
  hasStartIntent: false,
  sseStatus: initialSSEStatus,
  colyseusSessionId: null,
  setSessionMeta: (meta) => {
    console.log('[sessionStore] setSessionMeta called with:', meta);
    set({ sessionMeta: meta });
  },
  setStartIntent: (v) => set({ hasStartIntent: v }),
  setSSEState: (state, error) => set((prev) => ({
    sseStatus: { ...prev.sseStatus, state, error: error || null }
  })),
  setSSEEvent: (eventType) => set((prev) => ({
    sseStatus: { ...prev.sseStatus, lastEventTime: Date.now(), lastEventType: eventType }
  })),
  setColyseusSessionId: (id) => set({ colyseusSessionId: id }),
  clear: () => {
    console.log('[sessionStore] clear called');
    set({ sessionMeta: null, hasStartIntent: false, sseStatus: initialSSEStatus, colyseusSessionId: null });
  },
}));
