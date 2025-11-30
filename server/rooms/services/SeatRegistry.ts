export class SeatRegistry {
  private roleToSession = new Map<string, string>();
  private sessionToRole = new Map<string, string>();

  reserve(role: string, sessionId: string): { ok: boolean; reason?: string } {
    if (!role || !role.trim()) return { ok: true }; // empty role is always allowed (no reservation)
    const holder = this.roleToSession.get(role);
    if (!holder) {
      this.roleToSession.set(role, sessionId);
      this.sessionToRole.set(sessionId, role);
      return { ok: true };
    }
    if (holder === sessionId) {
      return { ok: true }; // idempotent re-reservation
    }
    return { ok: false, reason: 'taken' };
  }

  releaseBySession(sessionId: string) {
    const role = this.sessionToRole.get(sessionId);
    if (role) {
      this.sessionToRole.delete(sessionId);
      const holder = this.roleToSession.get(role);
      if (holder === sessionId) this.roleToSession.delete(role);
    }
  }

  releaseByRole(role: string) {
    const holder = this.roleToSession.get(role);
    if (holder) {
      this.roleToSession.delete(role);
      this.sessionToRole.delete(holder);
    }
  }

  getRoleBySession(sessionId: string): string | undefined {
    return this.sessionToRole.get(sessionId);
  }

  getHolder(role: string): string | undefined {
    return this.roleToSession.get(role);
  }

  isTaken(role: string): boolean {
    return this.roleToSession.has(role);
  }

  snapshot() {
    return {
      roleToSession: Array.from(this.roleToSession.entries()),
      sessionToRole: Array.from(this.sessionToRole.entries()),
    };
  }
}

