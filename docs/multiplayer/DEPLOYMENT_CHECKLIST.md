# Cloud Run Deployment Checklist

This checklist covers the steps to deploy Next.js + Colyseus to Google Cloud Run using GitHub Actions.

## Prerequisites

- [ ] Google Cloud Project created
- [ ] Billing enabled on GCP project
- [ ] GitHub repository set up

## Step 1: Enable GCP APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 2: Create Artifact Registry

```bash
gcloud artifacts repositories create simulacra \
  --repository-format=docker \
  --location=us-central1 \
  --description="Simulacra Docker images"
```

## Step 3: Create Secret Manager Secrets

```bash
# Required secrets for Next.js
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-litellm-key" | gcloud secrets create LITELLM_API_KEY --data-file=-
echo -n "your-clerk-secret" | gcloud secrets create CLERK_SECRET_KEY --data-file=-
echo -n "your-clerk-public-key" | gcloud secrets create NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY --data-file=-

# Required secrets for Colyseus
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "your-sentry-dsn" | gcloud secrets create SENTRY_DSN --data-file=-
```

## Step 4: Grant Cloud Build Service Account Access

```bash
# Get project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Secret Manager access
for secret in DATABASE_URL LITELLM_API_KEY CLERK_SECRET_KEY NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY OPENAI_API_KEY SENTRY_DSN; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Grant Cloud Run admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account user role (to deploy as specific service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Step 5: Create GitHub Actions Service Account

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"

# Grant Cloud Build editor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Grant Artifact Registry writer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Create and download service account key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Print the key (you'll copy this to GitHub)
cat github-actions-key.json
```

**IMPORTANT**: Copy the entire JSON output. You'll need it for the next step.

## Step 6: Configure GitHub Repository Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GCP_CREDENTIALS`
5. Value: Paste the entire contents of `github-actions-key.json`
6. Click **Add secret**

**Security**: Delete the local key file after adding to GitHub:
```bash
rm github-actions-key.json
```

## Step 7: Add GitHub Repository Secret for Project ID

1. In GitHub **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GCP_PROJECT_ID`
4. Value: Your project ID (e.g., `simulacra-prod`)
5. Click **Add secret**

## Step 8: Update GitHub Actions Workflow (Optional)

The workflow currently uses `credentials_json` and passes `BRANCH_NAME` as a substitution. If you need to reference your project ID explicitly:

```yaml
- name: Submit Build
  run: |
    gcloud builds submit --config cloudbuild.yaml \
      --project=${{ secrets.GCP_PROJECT_ID }} \
      --substitutions=BRANCH_NAME=${GITHUB_REF_NAME} \
      .
```

## Step 9: Test Deployment

```bash
# Commit deployment files
git add .github/workflows/deploy.yml cloudbuild.yaml Dockerfile.nextjs Dockerfile.colyseus
git commit -m "Add Cloud Run deployment configuration"

# Push to trigger deployment
git push origin feat/stein-multiplayer
```

## Step 10: Monitor Deployment

1. Go to your GitHub repository → **Actions** tab
2. Click on the running workflow
3. Watch the build logs
4. When complete, you'll see:
   - Next.js deployed to: `https://simulacra-web-feat-stein-multiplayer-[PROJECT_NUMBER]-us-central1.a.run.app`
   - Colyseus deployed to: `https://simulacra-colyseus-feat-stein-multiplayer-[PROJECT_NUMBER]-us-central1.a.run.app`

## Troubleshooting

### Build fails with "Permission denied"
- Check that Cloud Build service account has Secret Manager access
- Check that GitHub Actions service account has Cloud Build editor role

### "Repository not found" error
- Verify Artifact Registry repository exists: `gcloud artifacts repositories list`
- Check repository name matches `simulacra` in `cloudbuild.yaml`

### Deployment succeeds but app crashes
- Check Cloud Run logs: `gcloud run services logs read SERVICE_NAME --region=us-central1`
- Verify all required secrets are created and accessible

### "Image not found" error
- Check that images were pushed to Artifact Registry
- Verify project ID in image paths matches your project

## Production Deployment (Main Branch)

When you merge to `main`, the deployment will use custom domains:
- Next.js: `https://simulacra.cc`
- Colyseus: `https://game.simulacra.cc`

**Before merging to main**, set up domain mapping:

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service=simulacra-web-prod \
  --domain=simulacra.cc \
  --region=us-central1

gcloud run domain-mappings create \
  --service=simulacra-colyseus-prod \
  --domain=game.simulacra.cc \
  --region=us-central1
```

Then update DNS records with the provided values.

## Cost Optimization

Cloud Run charges only for actual usage. To minimize costs:

- **Next.js**: `--min-instances 0` (scales to zero when idle)
- **Colyseus**: `--min-instances 1` (keeps one instance warm for WebSocket connections)

Estimated costs:
- Next.js: ~$5-20/month (depends on traffic)
- Colyseus: ~$10-30/month (1 instance always running)
- Cloud Build: First 120 build-minutes/day free
