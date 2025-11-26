## Appendix A: Key Files Structure

```
simulacra/
├── server/
│   ├── index.ts                      # NEW: Express + Colyseus + Next handler
│   └── routes/
│       └── admin.ts                  # NEW: Colyseus admin routes (/colyseus-admin/*)
├── game-server/                       # Colyseus game logic
│   ├── rooms/
│   │   └── GameRoom.ts               # Main game room
│   ├── schema/
│   │   └── GameState.ts              # Colyseus state schema
│   └── lib/
│       └── ai.ts                      # AI service (moved from services/)
├── pages/
│   ├── index.tsx                      # Landing page (keep)
│   ├── lobby.tsx                      # Room creation (keep, update for room codes)
│   ├── game/[code].tsx               # NEW: Join by room code
│   ├── admin/
│   │   ├── index.tsx                 # NEW: Admin login
│   │   ├── rooms.tsx                 # NEW: Game list
│   │   └── rooms/[id].tsx            # NEW: Game details
│   └── api/                           # (Keep for other Next APIs if needed)
├── hooks/
│   ├── useGameRoom.ts                # NEW: Colyseus client hook
│   └── useGameController.ts          # OLD: Can keep for SSE fallback
├── components/
│   └── game/                          # Keep all existing components
├── lib/
│   ├── prisma.ts                      # Keep
│   ├── logger.ts                      # NEW: Structured logging
│   ├── roomCodes.ts                   # NEW: Room code generation
│   └── featureFlags.ts                # NEW: Colyseus rollout control
├── services/
│   └── geminiService.ts              # Move to game-server/lib/ai.ts
├── package.json                       # Update: Add colyseus deps, new scripts
├── Dockerfile                         # Update: Custom server build
└── cloud-run.yaml                     # NEW: Cloud Run config
```

---

## Appendix B: Communication Plan

### Internal Team
- **Kickoff Meeting (Day 0):** Review this document, assign responsibilities
- **Daily Standups:** 15 min sync on progress, blockers
- **Decision Gates:** End of Day 2, 6, 13, 15 - explicit go/no-go decisions
- **Week 4 Prep:** Daily check-ins leading up to IRL event

### Stakeholders
- **Week 1 Update:** "Migration underway, core functionality working"
- **Week 2 Update:** "Production deployment scheduled, testing in progress"
- **Week 3 Update:** "GO/NO-GO decision for IRL event" (with data)
- **Post-Event:** "Event debrief, lessons learned, next steps"

### Users (If Applicable)
- **During Migration:** "We're improving multiplayer - you might see experimental features"
- **Week 3:** "New multiplayer launching soon - join us for testing!"
- **Post-Event:** "Stable multiplayer now live for everyone"

---

## Appendix C: Rollback Procedure

**If we need to revert to SSE:**

### Immediate Rollback (< 5 minutes)
```bash
# Set feature flag to 0% (all users on SSE)
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=0

# Verify: All new connections use SSE
# Existing Colyseus rooms finish naturally (don't forcibly disconnect)
```

### Investigation Period (1-2 hours)
- Gather error logs, identify root cause
- Assess: Quick fix? Or deeper issue?

### Decision
- **Quick fix possible:** Fix, test in staging, redeploy, gradually re-enable
- **Deeper issue:** Keep SSE for IRL event, fix Colyseus post-event

### Post-Mortem (After event)
- Document what went wrong
- Decide: Continue Colyseus work or pivot to different solution

---

## Conclusion

### Why This Plan Will Succeed

1. **User-Validated Need:** 100 playthroughs, 20 users, clear demand for multiplayer
2. **Clear Deadline:** IRL event in 4 weeks provides focus and urgency
3. **Realistic Timeline:** 3 weeks + 1 week buffer, with timeboxes and circuit breakers
4. **Risk Mitigation:** Feature flag allows instant rollback, SSE remains available
5. **Right Simplifications:** Room codes over accounts saves 2-3 days
6. **Event-Specific Tools:** Admin dashboard ensures we can debug live issues
7. **Team Alignment:** Clear success criteria, decision gates, communication plan

### What Success Looks Like

**Week 3:**
- Colyseus deployed, load-tested, user-validated
- Feature flag at 50-100%, error rate <1%
- Admin dashboard functional
- Confident (>90%) for IRL event

**IRL Event:**
- 18-24 participants play 3-4 simultaneous games
- Tech works smoothly, no "please refresh" moments
- When issues arise, resolved in <5 min
- Participants focus on strategy, not tech problems

**Post-Event:**
- Colyseus at 100%, SSE deleted
- Development velocity 2x (focus on gameplay, not infrastructure)
- Foundation for autonomous AI agents (Milestone 2)
- Business validated (paid events, partnerships)

---

**Next Steps:**
1. Team review of this document (Day 0)
2. Environment setup (feature flags, logging) (Day 0 afternoon)
3. Begin Phase 1: Custom server + basic room (Day 1 morning)

**Let's ship this.** 🚀

---

**Document Owner:** Development Team
**Last Updated:** 2025-11-14
**Next Review:** End of Week 1 (Day 5), then weekly
**Questions/Feedback:** [Your contact info]
