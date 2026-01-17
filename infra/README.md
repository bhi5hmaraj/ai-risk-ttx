# Simulacra Cloud Run Infra (Minimal)

This directory provisions **two Cloud Run services** via Terraform:

- `simulacra-stein` (Colyseus game server)
- `simulacra-app` (Next.js app)

Secrets are injected via **Secret Manager** (e.g. `INFISICAL_TOKEN`).

## Prereqs

- `gcloud auth login`
- `gcloud config set project <PROJECT_ID>`
- Terraform >= 1.6
- Artifact Registry repo exists: `simulacra` in your region
- Secret Manager secret exists: `INFISICAL_TOKEN`

## One-time: Terraform state bucket

Create a GCS bucket for Terraform state (pick a unique name):

```bash
PROJECT_ID="<PROJECT_ID>"
REGION="us-central1"
BUCKET="simulacra-tf-state-${PROJECT_ID}"

gcloud storage buckets create "gs://${BUCKET}" --project "${PROJECT_ID}" --location "${REGION}"
```

Then update `infra/personal/backend.tf` with your bucket name.

## Apply (local)

```bash
cd infra/personal
terraform init

terraform apply -auto-approve \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="app_image=us-central1-docker.pkg.dev/${PROJECT_ID}/simulacra/nextjs:latest" \
  -var="stein_image=us-central1-docker.pkg.dev/${PROJECT_ID}/simulacra/colyseus:latest"
```

Outputs include:
- `app_url`
- `stein_url`

