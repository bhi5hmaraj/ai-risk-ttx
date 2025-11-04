import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/stores/sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  describe('Initial State', () => {
    it('should have null sessionMeta', () => {
      const { sessionMeta } = useSessionStore.getState();
      expect(sessionMeta).toBeNull();
    });

    it('should have hasStartIntent as false', () => {
      const { hasStartIntent } = useSessionStore.getState();
      expect(hasStartIntent).toBe(false);
    });

    it('should check isBackendMode from environment', () => {
      const { isBackendMode } = useSessionStore.getState();
      // Will be true or false depending on NEXT_PUBLIC_BACKEND_STATE env var
      expect(typeof isBackendMode).toBe('boolean');
    });
  });

  describe('setSessionMeta', () => {
    it('should set sessionMeta', () => {
      const mockMeta = {
        id: 'session-123',
        revision: 1,
        hostToken: 'token-abc',
      };

      useSessionStore.getState().setSessionMeta(mockMeta);

      const { sessionMeta } = useSessionStore.getState();
      expect(sessionMeta).toEqual(mockMeta);
      expect(sessionMeta?.id).toBe('session-123');
      expect(sessionMeta?.revision).toBe(1);
      expect(sessionMeta?.hostToken).toBe('token-abc');
    });

    it('should allow setting to null', () => {
      const mockMeta = {
        id: 'session-123',
        revision: 1,
        hostToken: 'token-abc',
      };

      useSessionStore.getState().setSessionMeta(mockMeta);
      expect(useSessionStore.getState().sessionMeta).not.toBeNull();

      useSessionStore.getState().setSessionMeta(null);
      expect(useSessionStore.getState().sessionMeta).toBeNull();
    });

    it('should update revision when set multiple times', () => {
      useSessionStore.getState().setSessionMeta({
        id: 'session-123',
        revision: 1,
        hostToken: 'token-abc',
      });

      useSessionStore.getState().setSessionMeta({
        id: 'session-123',
        revision: 2,
        hostToken: 'token-abc',
      });

      const { sessionMeta } = useSessionStore.getState();
      expect(sessionMeta?.revision).toBe(2);
    });
  });

  describe('setStartIntent', () => {
    it('should set hasStartIntent to true', () => {
      useSessionStore.getState().setStartIntent(true);

      const { hasStartIntent } = useSessionStore.getState();
      expect(hasStartIntent).toBe(true);
    });

    it('should set hasStartIntent to false', () => {
      useSessionStore.getState().setStartIntent(true);
      useSessionStore.getState().setStartIntent(false);

      const { hasStartIntent } = useSessionStore.getState();
      expect(hasStartIntent).toBe(false);
    });

    it('should toggle hasStartIntent', () => {
      useSessionStore.getState().setStartIntent(true);
      expect(useSessionStore.getState().hasStartIntent).toBe(true);

      useSessionStore.getState().setStartIntent(false);
      expect(useSessionStore.getState().hasStartIntent).toBe(false);

      useSessionStore.getState().setStartIntent(true);
      expect(useSessionStore.getState().hasStartIntent).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear sessionMeta', () => {
      useSessionStore.getState().setSessionMeta({
        id: 'session-123',
        revision: 5,
        hostToken: 'token-abc',
      });

      useSessionStore.getState().clear();

      const { sessionMeta } = useSessionStore.getState();
      expect(sessionMeta).toBeNull();
    });

    it('should clear hasStartIntent', () => {
      useSessionStore.getState().setStartIntent(true);

      useSessionStore.getState().clear();

      const { hasStartIntent } = useSessionStore.getState();
      expect(hasStartIntent).toBe(false);
    });

    it('should clear all state together', () => {
      // Set all state
      useSessionStore.getState().setSessionMeta({
        id: 'session-123',
        revision: 3,
        hostToken: 'token-abc',
      });
      useSessionStore.getState().setStartIntent(true);

      // Clear
      useSessionStore.getState().clear();

      // Verify all cleared
      const state = useSessionStore.getState();
      expect(state.sessionMeta).toBeNull();
      expect(state.hasStartIntent).toBe(false);
    });

    it('should not affect isBackendMode', () => {
      const { isBackendMode: before } = useSessionStore.getState();

      useSessionStore.getState().clear();

      const { isBackendMode: after } = useSessionStore.getState();
      expect(after).toBe(before);
    });
  });

  describe('Session Flow', () => {
    it('should handle typical session lifecycle', () => {
      // 1. Initial state
      let state = useSessionStore.getState();
      expect(state.sessionMeta).toBeNull();
      expect(state.hasStartIntent).toBe(false);

      // 2. User clicks "Start Game"
      useSessionStore.getState().setStartIntent(true);
      state = useSessionStore.getState();
      expect(state.hasStartIntent).toBe(true);

      // 3. Session created by backend
      useSessionStore.getState().setSessionMeta({
        id: 'new-session',
        revision: 1,
        hostToken: 'host-token',
      });
      state = useSessionStore.getState();
      expect(state.sessionMeta?.id).toBe('new-session');

      // 4. Session updates (revision increases)
      useSessionStore.getState().setSessionMeta({
        id: 'new-session',
        revision: 2,
        hostToken: 'host-token',
      });
      state = useSessionStore.getState();
      expect(state.sessionMeta?.revision).toBe(2);

      // 5. Game ends, clean up
      useSessionStore.getState().clear();
      state = useSessionStore.getState();
      expect(state.sessionMeta).toBeNull();
      expect(state.hasStartIntent).toBe(false);
    });
  });
});
