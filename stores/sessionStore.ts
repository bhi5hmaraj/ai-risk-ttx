import { create } from 'zustand';

type SessionMeta = { id: string; revision: number; hostToken: string } | null;

interface SessionStore {
  sessionMeta: SessionMeta;
  hasStartIntent: boolean;
  setSessionMeta: (meta: SessionMeta) => void;
  setStartIntent: (v: boolean) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionMeta: null,
  hasStartIntent: false,
  setSessionMeta: (meta) => {
    console.log('[sessionStore] setSessionMeta called with:', meta);
    set({ sessionMeta: meta });
  },
  setStartIntent: (v) => set({ hasStartIntent: v }),
  clear: () => {
    console.log('[sessionStore] clear called');
    set({ sessionMeta: null, hasStartIntent: false });
  },
}));
