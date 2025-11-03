import { create } from 'zustand';

type SessionMeta = { id: string; revision: number; hostToken: string } | null;

interface SessionStore {
  sessionMeta: SessionMeta;
  isBackendMode: boolean;
  hasStartIntent: boolean;
  setSessionMeta: (meta: SessionMeta) => void;
  setStartIntent: (v: boolean) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionMeta: null,
  isBackendMode: typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_BACKEND_STATE === '1'),
  hasStartIntent: false,
  setSessionMeta: (meta) => set({ sessionMeta: meta }),
  setStartIntent: (v) => set({ hasStartIntent: v }),
  clear: () => set({ sessionMeta: null, hasStartIntent: false }),
}));

