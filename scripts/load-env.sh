#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/load-env.sh <env-file> -- <command> [args...]

Loads KEY=VALUE pairs from an env file (supports quoted values), exports them,
then runs the provided command.

Example:
  ./scripts/load-env.sh .env.infiscal -- MODE=hostdb ./scripts/docker-local-run.sh up

Notes:
  - This is intentionally minimal and does not support complex shell syntax in values.
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

ENV_FILE="${1:-}"
shift || true
if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  usage
  exit 1
fi

if [ "${1:-}" != "--" ]; then
  echo "Error: expected -- before command" >&2
  usage
  exit 1
fi
shift || true

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Support leading KEY=VALUE assignments before the command.
while [ "$#" -gt 0 ]; do
  case "$1" in
    *=*)
      export "$1"
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [ "$#" -eq 0 ]; then
  echo "Error: missing command after env vars" >&2
  usage
  exit 1
fi

exec "$@"
