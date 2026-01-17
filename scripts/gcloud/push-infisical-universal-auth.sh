#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/gcloud/push-infisical-universal-auth.sh

Reads machine identity creds from `.env.infiscal` (or `.env.infisical`) and
uploads them to GCP Secret Manager as:
  - INFISICAL_UA_CLIENT_ID
  - INFISICAL_UA_CLIENT_SECRET

It does NOT print secret values.

Requirements:
  - gcloud authenticated + project set
  - `.env.infiscal` (recommended) containing:
      INFISICAL_UNIVERSAL_AUTH_CLIENT_ID
      INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud not found" >&2
  exit 1
fi

ENV_FILE=""
if [ -f ".env.infiscal" ]; then
  ENV_FILE=".env.infiscal"
elif [ -f ".env.infisical" ]; then
  ENV_FILE=".env.infisical"
else
  echo "Error: .env.infiscal (or .env.infisical) not found" >&2
  exit 1
fi

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "Error: gcloud project is not set. Run: gcloud config set project <project-id>" >&2
  exit 1
fi

SECRET_ID_NAME="${SECRET_ID_NAME:-INFISICAL_UA_CLIENT_ID}"
SECRET_SECRET_NAME="${SECRET_SECRET_NAME:-INFISICAL_UA_CLIENT_SECRET}"

echo "Project: $PROJECT_ID"
echo "Env file: $ENV_FILE"
echo "Secrets:"
echo "  - $SECRET_ID_NAME"
echo "  - $SECRET_SECRET_NAME"

create_if_missing() {
  local name="$1"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    echo "Creating secret '$name'..."
    gcloud secrets create "$name" --replication-policy="automatic" >/dev/null
  fi
}

add_version_from_env() {
  local name="$1"
  local key="$2"
  node -e "
    process.env.DOTENV_CONFIG_QUIET='true';
    const fs=require('fs');
    const dotenv=require('dotenv');
    const path=process.env.ENV_FILE;
    dotenv.config({path});
    const raw=process.env['${key}']||'';
    const trimmed=String(raw).trim();
    const unquoted = (s) => (s.length>=2 && ((s.startsWith('\"') && s.endsWith('\"')) || (s.startsWith(\"'\") && s.endsWith(\"'\")))) ? s.slice(1,-1) : s;
    const v=unquoted(trimmed).trim();
    if(!v){ process.exit(2); }
    process.stdout.write(v);
  " | gcloud secrets versions add "$name" --data-file=- >/dev/null
}

create_if_missing "$SECRET_ID_NAME"
create_if_missing "$SECRET_SECRET_NAME"

export ENV_FILE

echo "Adding new versions..."
add_version_from_env "$SECRET_ID_NAME" "INFISICAL_UNIVERSAL_AUTH_CLIENT_ID"
add_version_from_env "$SECRET_SECRET_NAME" "INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
CLOUDBUILD_SA="${CLOUDBUILD_SA:-${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com}"

echo "Granting Secret Manager access:"
echo "  - Cloud Build SA: $CLOUDBUILD_SA"
echo "  - Cloud Run runtime SA: $RUNTIME_SA"

for name in "$SECRET_ID_NAME" "$SECRET_SECRET_NAME"; do
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null

  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

echo "OK: uploaded universal auth secrets."
