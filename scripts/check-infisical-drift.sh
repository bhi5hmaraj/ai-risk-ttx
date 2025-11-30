#!/bin/bash

# Check for drift between .env.local and Infisical
# Helps catch when local secrets are out of sync with central source of truth

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Infisical Drift Detection"
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

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "Create .env.local with at least:"
    echo "  INFISICAL_TOKEN=st.dev.your-token-here"
    echo ""
    exit 1
fi

# Check if user is logged in to Infisical
echo "🔐 Checking Infisical authentication..."
if ! infisical whoami &> /dev/null; then
    echo "⚠️  Not logged in to Infisical CLI"
    echo ""
    echo "You can either:"
    echo "  1. Login: infisical login"
    echo "  2. Use INFISICAL_TOKEN from .env.local (will use SDK instead)"
    echo ""
    USE_CLI=false
else
    echo "✓ Authenticated to Infisical CLI"
    USE_CLI=true
fi

echo ""

# Determine environment to check
ENV="${1:-development}"
echo "📦 Checking environment: $ENV"
echo ""

# Keys to ignore (platform-managed, not in Infisical)
IGNORE_KEYS=(
    "NODE_ENV"
    "PORT"
    "NEXT_PUBLIC_APP_URL"
    "NEXT_PUBLIC_COLYSEUS_URL"
    "NEXT_PUBLIC_COLYSEUS_HTTP_BASE"
    "NEXT_DEV_PORT"
    "COLYSEUS_PORT"
    "TEST_COLYSEUS_URL"
    "VERCEL"
    "VERCEL_URL"
    "VERCEL_ENV"
)

# Function to check if key should be ignored
should_ignore() {
    local key=$1
    for ignore in "${IGNORE_KEYS[@]}"; do
        if [[ "$key" == "$ignore"* ]]; then
            return 0
        fi
    done
    return 1
}

# Read secrets from .env.local
declare -A LOCAL_SECRETS
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Remove quotes from value
    value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')

    LOCAL_SECRETS["$key"]="$value"
done < .env.local

# Get secrets from Infisical
echo "📥 Fetching secrets from Infisical ($ENV environment)..."
echo ""

declare -A INFISICAL_SECRETS

if [ "$USE_CLI" = true ]; then
    # Use CLI
    while IFS='=' read -r key value; do
        [[ -z "$key" ]] && continue
        INFISICAL_SECRETS["$key"]="$value"
    done < <(infisical secrets --env="$ENV" --plain 2>/dev/null || echo "")
else
    # Use INFISICAL_TOKEN from .env.local
    if [ -z "${LOCAL_SECRETS[INFISICAL_TOKEN]:-}" ]; then
        echo "❌ INFISICAL_TOKEN not found in .env.local"
        echo "   Add it or run: infisical login"
        exit 1
    fi

    echo "⚠️  Using INFISICAL_TOKEN from .env.local"
    echo ""

    # Note: This would require implementing SDK fetch in bash or using a helper script
    # For now, prompt user to login
    echo "Please run: infisical login"
    echo "Then re-run this script"
    exit 1
fi

if [ ${#INFISICAL_SECRETS[@]} -eq 0 ]; then
    echo "⚠️  No secrets found in Infisical for environment: $ENV"
    echo ""
    echo "Make sure you've:"
    echo "  1. Created the '$ENV' environment in Infisical"
    echo "  2. Added secrets to that environment"
    echo ""
    exit 1
fi

echo "✓ Fetched ${#INFISICAL_SECRETS[@]} secrets from Infisical"
echo ""

# Compare secrets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Drift Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DRIFT_FOUND=false
ONLY_IN_LOCAL=()
ONLY_IN_INFISICAL=()
VALUE_MISMATCH=()

# Check for keys only in .env.local
for key in "${!LOCAL_SECRETS[@]}"; do
    if should_ignore "$key"; then
        continue
    fi

    if [ -z "${INFISICAL_SECRETS[$key]:-}" ]; then
        ONLY_IN_LOCAL+=("$key")
        DRIFT_FOUND=true
    fi
done

# Check for keys only in Infisical
for key in "${!INFISICAL_SECRETS[@]}"; do
    if should_ignore "$key"; then
        continue
    fi

    if [ -z "${LOCAL_SECRETS[$key]:-}" ]; then
        ONLY_IN_INFISICAL+=("$key")
        DRIFT_FOUND=true
    fi
done

# Check for value mismatches
for key in "${!LOCAL_SECRETS[@]}"; do
    if should_ignore "$key"; then
        continue
    fi

    if [ -n "${INFISICAL_SECRETS[$key]:-}" ]; then
        local_val="${LOCAL_SECRETS[$key]}"
        infisical_val="${INFISICAL_SECRETS[$key]}"

        if [ "$local_val" != "$infisical_val" ]; then
            VALUE_MISMATCH+=("$key")
            DRIFT_FOUND=true
        fi
    fi
done

# Report findings
if [ "$DRIFT_FOUND" = false ]; then
    echo "✅ No drift detected!"
    echo ""
    echo "Your .env.local is in sync with Infisical ($ENV)."
    exit 0
fi

echo "⚠️  Drift detected between .env.local and Infisical!"
echo ""

if [ ${#ONLY_IN_LOCAL[@]} -gt 0 ]; then
    echo "📋 Only in .env.local (not in Infisical):"
    for key in "${ONLY_IN_LOCAL[@]}"; do
        echo "  - $key"
    done
    echo ""
    echo "   → Consider adding these to Infisical or removing from .env.local"
    echo ""
fi

if [ ${#ONLY_IN_INFISICAL[@]} -gt 0 ]; then
    echo "☁️  Only in Infisical (not in .env.local):"
    for key in "${ONLY_IN_INFISICAL[@]}"; do
        echo "  - $key"
    done
    echo ""
    echo "   → These will be loaded from Infisical at runtime"
    echo ""
fi

if [ ${#VALUE_MISMATCH[@]} -gt 0 ]; then
    echo "⚠️  Different values:"
    for key in "${VALUE_MISMATCH[@]}"; do
        echo "  - $key"
        echo "      .env.local:  ${LOCAL_SECRETS[$key]:0:20}..."
        echo "      Infisical:   ${INFISICAL_SECRETS[$key]:0:20}..."
    done
    echo ""
    echo "   → .env.local values will be used locally (override Infisical)"
    echo "   → Update .env.local OR update Infisical to match"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1 (Recommended): Use Infisical as source of truth"
echo "  - Remove secrets from .env.local"
echo "  - Keep only: INFISICAL_TOKEN, NODE_ENV"
echo "  - Run: infisical run --env=$ENV -- pnpm run dev"
echo ""
echo "Option 2: Keep .env.local for quick local iteration"
echo "  - Accept drift for local development"
echo "  - Update .env.local when Infisical changes"
echo "  - Production/staging always use Infisical (no drift there)"
echo ""
echo "Option 3: Sync .env.local from Infisical"
echo "  - Run: infisical secrets --env=$ENV > .env.local"
echo "  - Manually add local-only vars (NODE_ENV, PORT, etc.)"
echo ""

exit 1
