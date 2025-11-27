#!/bin/bash

# Environment Variable Comparison Script
# Compares Vercel env vars across Production, Preview, and Development

echo "==================================="
echo "Environment Variables Comparison"
echo "==================================="
echo ""
printf "%-40s %-10s %-10s %-10s\n" "VARIABLE" "PROD" "PREVIEW" "DEV"
printf "%-40s %-10s %-10s %-10s\n" "--------" "----" "-------" "---"

# Parse vercel env ls output
vercel env ls 2>&1 | tail -n +2 | head -n -5 | while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    envs=$(echo "$line" | sed 's/.*Encrypted//' | awk -F'[0-9]+d ago' '{print $1}' | xargs)

    # Check which environments it's in
    in_prod=$(echo "$envs" | grep -q "Production" && echo "✓" || echo "✗")
    in_preview=$(echo "$envs" | grep -q "Preview" && echo "✓" || echo "✗")
    in_dev=$(echo "$envs" | grep -q "Development" && echo "✓" || echo "✗")

    printf "%-40s %-10s %-10s %-10s\n" "$name" "$in_prod" "$in_preview" "$in_dev"
done

echo ""
echo "==================================="
echo "Set Differences:"
echo "==================================="

# Only in Preview
echo ""
echo "📦 ONLY IN PREVIEW (not in Production):"
vercel env ls 2>&1 | tail -n +2 | head -n -5 | while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    envs=$(echo "$line" | sed 's/.*Encrypted//' | awk -F'[0-9]+d ago' '{print $1}' | xargs)

    has_preview=$(echo "$envs" | grep -q "Preview" && echo "1" || echo "0")
    has_prod=$(echo "$envs" | grep -q "Production" && echo "1" || echo "0")

    if [ "$has_preview" = "1" ] && [ "$has_prod" = "0" ]; then
        echo "  - $name"
    fi
done

# Only in Production
echo ""
echo "🚀 ONLY IN PRODUCTION (not in Preview):"
vercel env ls 2>&1 | tail -n +2 | head -n -5 | while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    envs=$(echo "$line" | sed 's/.*Encrypted//' | awk -F'[0-9]+d ago' '{print $1}' | xargs)

    has_preview=$(echo "$envs" | grep -q "Preview" && echo "1" || echo "0")
    has_prod=$(echo "$envs" | grep -q "Production" && echo "1" || echo "0")

    if [ "$has_prod" = "1" ] && [ "$has_preview" = "0" ]; then
        echo "  - $name"
    fi
done

# In both
echo ""
echo "✓ IN BOTH (Production + Preview):"
vercel env ls 2>&1 | tail -n +2 | head -n -5 | while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    envs=$(echo "$line" | sed 's/.*Encrypted//' | awk -F'[0-9]+d ago' '{print $1}' | xargs)

    has_preview=$(echo "$envs" | grep -q "Preview" && echo "1" || echo "0")
    has_prod=$(echo "$envs" | grep -q "Production" && echo "1" || echo "0")

    if [ "$has_prod" = "1" ] && [ "$has_preview" = "1" ]; then
        echo "  - $name"
    fi
done

echo ""
