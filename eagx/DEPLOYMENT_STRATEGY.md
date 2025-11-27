# Colyseus Migration - Deployment Strategy (UPDATED)

## Decision: All-In on Colyseus + Branch-Based Testing

**Key Points:**
- ✅ No SSE fallback - Colyseus only
- ✅ No feature flags - Using branch-based deployment
- ✅ No gradual percentage rollout - Using canary/main branches

---

## Branch-Based Deployment Strategy

### Already Implemented in `cloudbuild.yaml`

```yaml
# Canary Branch → Preview Environment
if [ "$BRANCH_NAME" == "canary" ]; then
  SERVICE_NAME="simulacra-preview"
  APP_URL="https://simulacra-preview-uc.a.run.app"
fi

# Main Branch → Production Environment
if [ "$BRANCH_NAME" == "main" ]; then
  SERVICE_NAME="simulacra-prod"
  APP_URL="https://simulacra.cc"
fi
```

### Workflow

**Testing Phase (Now until Dec 9):**
1. Develop Colyseus features on `canary` branch
2. Push to GitHub triggers Cloud Build
3. Deploys to `simulacra-preview` service
4. Test with small group / team
5. Iterate and fix issues

**Production Deployment (Dec 9-12):**
1. Validate `simulacra-preview` is stable
2. Merge `canary` → `main`
3. Auto-deploys to `simulacra-prod` (simulacra.cc)
4. Dec 12 event uses production service

**Rollback Plan:**
If critical issues found:
```bash
# Revert the merge commit
git revert <merge-commit-sha>
git push origin main

# Or force rollback to previous main
git reset --hard <previous-commit>
git push --force origin main
```
→ Cloud Build auto-deploys previous version to prod

---

## Updated Critical Path

### Phase 0: Branch Setup (Immediate)
- ✅ `cloudbuild.yaml` already configured
- Create `canary` branch from current HEAD
- Set as protected branch (require review)

### Days 1-2 (Nov 27-28): Foundation
- **BLOCKING:** Cloud Run WebSocket smoke test on `simulacra-preview`
- Develop Schema, GameRoom, Messages on `canary`

### Days 3-6 (Nov 29-Dec 2): Core Features
- **BLOCKING:** LiteLLM Gemini validation
- Room codes, Postgres integration, AI agents
- Test on `simulacra-preview` continuously

### Days 7-9 (Dec 3-5): Polish
- Edge cases, admin dashboard
- Load testing on `simulacra-preview`

### Dec 9 (T-3): Final Validation
- Pre-event dry run with 18-24 people on `simulacra-preview`
- **GO Decision:** Ready to merge to main?
- If YES → Merge `canary` to `main`
- If NO → Keep working on `canary`, postpone merge

### Dec 10-11: Production Bake
- `simulacra-prod` running merged code
- Final smoke tests on production
- Monitor for any issues

### Dec 12: Event Day
- Production deployment stable
- Admin team has dashboard access
- On-site support ready

---

## Advantages of Branch-Based Approach

1. **Isolation:** Preview environment independent from prod
2. **Simplicity:** No feature flags, no percentage routing
3. **Git-Native:** Standard git workflow (branch → PR → merge)
4. **Rollback:** Standard git revert, known process
5. **Already Implemented:** No additional code needed

---

## Removed Tasks

- ~~ai-risk-ttx-dl7c: Feature Flag Toggle~~ → CLOSED (not needed)
- ~~Gradual Rollout 10% → 50%~~ → Not doing this approach

---

## Testing Checklist

### On `canary` branch / `simulacra-preview`:
- [ ] WebSocket connection from external client
- [ ] Room code join flow
- [ ] AI agents submit actions  
- [ ] Reconnection after disconnect
- [ ] Admin dashboard operations
- [ ] 20 concurrent games load test
- [ ] 18-24 person dry run

### After merge to `main` / `simulacra-prod`:
- [ ] Smoke test on production URL
- [ ] Verify DNS routing (simulacra.cc)
- [ ] Admin dashboard accessible
- [ ] Create a test game end-to-end
- [ ] Monitor Sentry for errors (24 hours)

---

## Emergency Contacts (Dec 12)

- **Git Operations:** [Team member who can force-push to main]
- **Cloud Run Access:** [Team member with gcloud admin]
- **Admin Dashboard:** https://simulacra.cc/admin/colyseus
- **Sentry:** https://sentry.io/organizations/[org]/issues/

---

## Decision Matrix

| Scenario | Action |
|----------|--------|
| Dry run > 95% success | ✅ Merge to main |
| Dry run 85-95% success | ⚠️ Team decision, document known issues |
| Dry run < 85% success | ❌ Do not merge, postpone or cancel event |
| Critical bug found Dec 10-11 | Revert merge, fix on canary, re-merge |
| Issue during event | Admin dashboard first, rollback if unrecoverable |
