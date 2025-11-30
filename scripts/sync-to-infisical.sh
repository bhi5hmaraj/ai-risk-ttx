#!/bin/bash

# Sync Vercel Environment Variables to Infisical
# This script helps you migrate secrets from Vercel to Infisical

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Vercel → Infisical Secret Migration Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Infisical CLI is installed
if ! command -v infisical &> /dev/null; then
    echo "❌ Infisical CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install infisical/infisical-cli/infisical"
    echo "  Linux:   curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash && sudo apt-get update && sudo apt-get install -y infisical"
    echo ""
    exit 1
fi

# Check if user is logged in to Infisical
echo "🔐 Checking Infisical authentication..."
if ! infisical whoami &> /dev/null; then
    echo "❌ Not logged in to Infisical!"
    echo ""
    echo "Run: infisical login"
    echo ""
    exit 1
fi

echo "✓ Authenticated to Infisical"
echo ""

# List of secrets to migrate (from Vercel env-diff output)
# Format: KEY=environment_scope
# Scopes: production, preview, development

SECRETS_TO_MIGRATE=(
    # Shared across all environments
    "ADMIN_EMAILS:all"
    "CLERK_SECRET_KEY:all"
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:all"
    "UPSTASH_REDIS_REST_TOKEN:all"
    "UPSTASH_REDIS_REST_URL:all"
    "REDIS_URL:all"
    "SESSION_STORE_TYPE:all"
    "LITELLM_API_KEY:all"
    "LITELLM_BASE_URL:all"
    "LLM_MODEL:all"
    "NEXT_PUBLIC_LLM_MODEL:all"
    "DEBUG_API:all"

    # Production-specific
    "DATABASE_URL:production"
    "POSTGRES_URL:production"
    "PRISMA_DATABASE_URL:production"

    # Preview-specific
    "NEXTAUTH_URL:preview"
    "DIRECT_DATABASE_URL:preview"
    "AUTH_SECRET:preview"
    "NEXTAUTH_SECRET:preview"
    "ADMIN_PASSWORD_1:preview"
    "PREVIEW_DB_DATABASE_URL:preview"
    "PREVIEW_DB_POSTGRES_URL:preview"
    "PREVIEW_DB_PRISMA_DATABASE_URL:preview"
)

echo "📋 Secrets to migrate:"
echo ""
for entry in "${SECRETS_TO_MIGRATE[@]}"; do
    KEY=$(echo "$entry" | cut -d: -f1)
    SCOPE=$(echo "$entry" | cut -d: -f2)
    echo "  - $KEY ($SCOPE)"
done
echo ""

# Ask for confirmation
read -p "Do you want to proceed with migration? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Migration Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to get secret value from Vercel
get_vercel_secret() {
    local key=$1
    local env=$2

    # Map scope to Vercel environment
    case $env in
        production) vercel_env="production" ;;
        preview) vercel_env="preview" ;;
        development) vercel_env="development" ;;
        all) vercel_env="production" ;;  # Default to production for shared secrets
        *) vercel_env="production" ;;
    esac

    # Get the secret value from Vercel
    vercel env pull --environment="$vercel_env" .env.tmp &> /dev/null || true

    if [ -f .env.tmp ]; then
        value=$(grep "^${key}=" .env.tmp | cut -d= -f2- | sed 's/^"//;s/"$//')
        rm .env.tmp
        echo "$value"
    fi
}

# Function to set secret in Infisical
set_infisical_secret() {
    local key=$1
    local value=$2
    local env=$3

    # Map scope to Infisical environment
    case $env in
        production) infisical_env="production" ;;
        preview) infisical_env="staging" ;;  # Map preview to staging
        development) infisical_env="development" ;;
        all)
            # Set in all environments
            echo "    → production..."
            echo "$value" | infisical secrets set "$key" --env=production --silent || true
            echo "    → staging..."
            echo "$value" | infisical secrets set "$key" --env=staging --silent || true
            echo "    → development..."
            echo "$value" | infisical secrets set "$key" --env=development --silent || true
            return
            ;;
    esac

    echo "$value" | infisical secrets set "$key" --env="$infisical_env" --silent || true
}

echo "⚠️  MANUAL MIGRATION REQUIRED"
echo ""
echo "Due to security restrictions, this script cannot automatically pull"
echo "secret values from Vercel. You'll need to:"
echo ""
echo "1. Go to Vercel dashboard: https://vercel.com/[your-team]/[your-project]/settings/environment-variables"
echo "2. For each secret below, copy its value"
echo "3. Add it to Infisical dashboard: https://app.infisical.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Secrets Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate checklist
for entry in "${SECRETS_TO_MIGRATE[@]}"; do
    KEY=$(echo "$entry" | cut -d: -f1)
    SCOPE=$(echo "$entry" | cut -d: -f2)

    # Map scope to Infisical environment name
    case $SCOPE in
        production) ENV_NAME="production" ;;
        preview) ENV_NAME="staging" ;;
        development) ENV_NAME="development" ;;
        all) ENV_NAME="production, staging, development" ;;
    esac

    echo "[ ] $KEY"
    echo "    Environments: $ENV_NAME"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to Infisical: https://app.infisical.com"
echo "2. Create environments: production, staging, development"
echo "3. Add each secret above to the appropriate environment(s)"
echo "4. Create service tokens for each environment"
echo "5. Add tokens to:"
echo "   - Vercel: INFISICAL_TOKEN (env var)"
echo "   - GCP Secret Manager: INFISICAL_TOKEN (for Cloud Run)"
echo ""
echo "📖 See docs/multiplayer/INFISICAL_QUICK_START.md for detailed steps"
echo ""
