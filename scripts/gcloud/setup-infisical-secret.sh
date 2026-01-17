#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/gcloud/setup-infisical-secret.sh <secret-name>

Creates (or updates) a Secret Manager secret by adding a new version from stdin.
The value is read from a silent prompt so it won't show up in your shell history.

Examples:
  ./scripts/gcloud/setup-infisical-secret.sh INFISICAL_TOKEN_STAGING
  ./scripts/gcloud/setup-infisical-secret.sh INFISICAL_TOKEN

Notes:
  - This script does NOT print the secret value.
  - Requires: gcloud, and an active project (gcloud config set project ...).
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

SECRET_NAME="${1:-}"
if [ -z "$SECRET_NAME" ]; then
  usage
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud not found" >&2
  exit 1
fi

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "Error: gcloud project is not set. Run: gcloud config set project <project-id>" >&2
  exit 1
fi

echo "Project: $PROJECT_ID"
echo "Secret:  $SECRET_NAME"

if ! gcloud secrets describe "$SECRET_NAME" >/dev/null 2>&1; then
  echo "Creating secret '$SECRET_NAME'..."
  gcloud secrets create "$SECRET_NAME" --replication-policy="automatic" >/dev/null
else
  echo "Secret exists; adding a new version..."
fi

read -r -s -p "Paste secret value (hidden): " SECRET_VALUE
echo ""
if [ -z "$SECRET_VALUE" ]; then
  echo "Error: empty secret value" >&2
  exit 1
fi

printf '%s' "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- >/dev/null
unset SECRET_VALUE

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
CLOUDBUILD_SA="${CLOUDBUILD_SA:-${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com}"

echo "Granting Secret Manager access:"
echo "  - Cloud Build SA: $CLOUDBUILD_SA"
echo "  - Cloud Run runtime SA: $RUNTIME_SA"

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

echo "OK: secret updated and IAM bindings applied."
