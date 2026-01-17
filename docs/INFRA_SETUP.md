# Infrastructure Setup (Cloud Run + Infisical)

This repo can run as **two Cloud Run services**:

- `simulacra-stein`: Colyseus multiplayer server (WebSockets + snapshot HTTP)
- `simulacra-app`: Next.js app (SSR + API routes)

Secrets are fetched at runtime from **Infisical** by `lib/infisical.ts` and injected into `process.env`. Cloud Run only needs Infisical auth credentials (from GCP Secret Manager) plus a few non-secret env vars like `INFISICAL_ENVIRONMENT` and `INFISICAL_PROJECT_ID`.

Related docs:
- `docs/CLOUD_RUN_TASKLIST.md` (end-to-end checklist)
- `docs/multiplayer/INFISICAL_QUICK_START.md` (Infisical concepts + setup)
- `infra/README.md` (Terraform module + local apply)

---

## One-Time GCP Setup

1. Pick a project + region:
   - `PROJECT_ID="<your-gcp-project-id>"`
   - `REGION="us-central1"`

2. Enable APIs:
   - Cloud Run
   - Cloud Build
   - Artifact Registry
   - Secret Manager

3. Create Artifact Registry repo (once):
   - Repo name: `simulacra`

Example commands:

```bash
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

gcloud artifacts repositories create simulacra \
  --repository-format=docker \
  --location="$REGION" \
  --description="Simulacra images"
```

4. Choose an Infisical auth mode for Cloud Run:

### Option A (recommended): Universal Auth (Machine Identity)

Create two Secret Manager secrets:
- `INFISICAL_UA_CLIENT_ID`
- `INFISICAL_UA_CLIENT_SECRET`

Cloud Build and Cloud Run will mount them into:
- `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID`
- `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET`

Example:

```bash
printf '%s' "$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" | gcloud secrets create INFISICAL_UA_CLIENT_ID --data-file=-
printf '%s' "$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" | gcloud secrets create INFISICAL_UA_CLIENT_SECRET --data-file=-
```

### Option B: Service Token

Create one Secret Manager secret:
- `INFISICAL_TOKEN`

Cloud Build / Cloud Run will mount it into:
- `INFISICAL_TOKEN`

Example:

```bash
printf '%s' "$INFISICAL_TOKEN" | gcloud secrets create INFISICAL_TOKEN --data-file=-
```

5. Grant secret access (minimum required):
- Cloud Build service account must be able to read any secrets used during build/release steps.
- Cloud Run runtime service account must be able to read any secrets mounted at deploy time.

Example (default service accounts):

```bash
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

# Cloud Build SA
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Default Compute SA (often the Cloud Run runtime SA unless you set a custom one)
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding INFISICAL_UA_CLIENT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding INFISICAL_UA_CLIENT_SECRET \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding INFISICAL_UA_CLIENT_ID \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding INFISICAL_UA_CLIENT_SECRET \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
```

If you’re using `INFISICAL_TOKEN` instead, apply the same bindings to that secret.

---

## One-Time Infisical Setup

1. Create an Infisical project (e.g. “Simulacra”).
2. Note the **Project ID (UUID)** and set it as `INFISICAL_PROJECT_ID`.
3. Create environments (slugs) you’ll use as `INFISICAL_ENVIRONMENT` (common: `dev`, `stg`, `prod`).
4. Add required secrets in Infisical for each environment (examples):
   - `DATABASE_URL`
   - `LITELLM_API_KEY`, `LITELLM_BASE_URL`, `LLM_MODEL`
   - any other server-only keys used by the app/server

Notes:
- The loader uses `INFISICAL_PROJECT_ID` (UUID), not a “project slug”.
- The loader does **not** override existing `process.env` keys (local overrides win).
- Secrets are cached in-memory for 5 minutes by default (see `lib/infisical.ts`).

---

## Local Smoke Test (Docker)

1. Create a local Infisical env file:
   - Copy `.env.infiscal.example` → `.env.infiscal`
   - Fill either `INFISICAL_TOKEN` or Universal Auth client id/secret
   - Set `INFISICAL_PROJECT_ID` and `INFISICAL_ENVIRONMENT`

2. Start locally:

```bash
./scripts/docker-local.sh up
```

If you don’t have Docker Compose:

```bash
./scripts/docker-local-run.sh up
```

Verify:
- Next.js: `http://localhost:3000`
- Stein: `http://localhost:3004/healthz`
- Logs show `[Infisical] Loaded ... secrets`

---

## Deploy (Recommended): Cloud Build Pipelines

### 1) Deploy Stein (Colyseus)

```bash
gcloud builds submit --config cloudbuild.colyseus.yaml --project="$PROJECT_ID" .
```

Optional overrides:
- `_SERVICE_NAME` (default `simulacra-stein`)
- `_INFISICAL_ENVIRONMENT` (default `prod`)
- `_INFISICAL_PROJECT_ID`
- `_INFISICAL_UA_CLIENT_ID_SECRET` / `_INFISICAL_UA_CLIENT_SECRET_SECRET` (Secret Manager secret names)
- `_INFISICAL_TOKEN_SECRET` (Secret Manager secret name; set to `none` to disable)

### 2) Deploy App (Next.js)

```bash
gcloud builds submit --config cloudbuild.nextjs.yaml \
  --project="$PROJECT_ID" \
  --substitutions=_COLYSEUS_SERVICE_NAME=simulacra-stein \
  .
```

Key behavior:
- `cloudbuild.nextjs.yaml` resolves the Colyseus URL, then **bakes** `NEXT_PUBLIC_COLYSEUS_*` into the image at build time.
- It runs Prisma migrations once per deploy via `scripts/prisma-migrate-infisical.mjs` (requires Infisical auth and `DATABASE_URL` in Infisical).

Important caveat:
- If the Colyseus URL changes, you must **rebuild** the Next.js image (runtime env vars won’t update the already-built client bundle).
- `cloudbuild.nextjs.yaml` currently expects Secret Manager secrets named exactly `INFISICAL_UA_CLIENT_ID` and `INFISICAL_UA_CLIENT_SECRET` for the migration step (see `availableSecrets`); if you rename them, update that file.

---

## Deploy (Alternative): Terraform (Minimal)

Terraform lives in `infra/` and provisions the two Cloud Run services.

Quick start:
- Follow `infra/README.md`
- Apply with image tags you’ve already built/pushed

Important caveats:
- The Terraform path currently injects `INFISICAL_TOKEN` by default (see `infra/personal/variables.tf`). If you want Universal Auth, update the Terraform module inputs to mount UA secrets instead.
- Terraform does **not** run Prisma migrations. Run migrations separately (for example via `node scripts/prisma-migrate-infisical.mjs` with appropriate `INFISICAL_*` env vars).

---

## Making Changes Safely

### App ↔ Stein connection changes

- Client-visible URLs are `NEXT_PUBLIC_COLYSEUS_URL` and `NEXT_PUBLIC_COLYSEUS_HTTP_BASE`.
- These are **build-time** values in `Dockerfile.nextjs`; changing them requires a rebuild + redeploy of the Next.js image.

### Secrets changes

- Update in Infisical.
- To pick up immediately: restart the Cloud Run service(s).
- Otherwise: wait for cache TTL (default 5 minutes) + process restart.

### Scaling Stein

- Colyseus is deployed with `--session-affinity` and is currently configured as `min=1/max=1` in Cloud Build.
- Do not scale above 1 without adding a shared presence/coordination layer (e.g. Redis Presence) and validating room routing behavior.

### Health checks

- Stein serves both `/healthz` and `/` (Cloud Run can treat `/healthz` differently depending on routing/proxies).
