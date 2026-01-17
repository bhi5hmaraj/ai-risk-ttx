#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.local.yml}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi
  echo "Error: neither 'docker compose' nor 'docker-compose' is available." >&2
  echo "Tip: Use ./scripts/docker-local-run.sh (no compose required) or install the compose plugin." >&2
  exit 1
}

extract_env_arg() {
  # Accept args like KEY=value and export selected keys for convenience.
  # This allows: ./scripts/docker-local.sh up COMPOSE_FILE=docker-compose.hostdb.yml
  local arg="$1"
  case "$arg" in
    COMPOSE_FILE=*)
      export COMPOSE_FILE="${arg#COMPOSE_FILE=}"
      ;;
    DATABASE_URL=*)
      export DATABASE_URL="${arg#DATABASE_URL=}"
      ;;
    INFISICAL_TOKEN=*)
      export INFISICAL_TOKEN="${arg#INFISICAL_TOKEN=}"
      ;;
    INFISICAL_ENVIRONMENT=*)
      export INFISICAL_ENVIRONMENT="${arg#INFISICAL_ENVIRONMENT=}"
      ;;
    *)
      return 1
      ;;
  esac
  return 0
}

cmd=${1:-}
shift || true

# Allow env-style args to appear after the command.
rest=()
for a in "$@"; do
  if extract_env_arg "$a"; then
    continue
  fi
  rest+=("$a")
done
set -- "${rest[@]:-}"

# Re-read compose file after env parsing.
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.local.yml}

case "$cmd" in
  up)
    compose -f "$COMPOSE_FILE" up --build "$@"
    ;;
  down)
    compose -f "$COMPOSE_FILE" down -v "$@"
    ;;
  logs)
    compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;
  ps)
    compose -f "$COMPOSE_FILE" ps "$@"
    ;;
  *)
    echo "Usage: $0 {up|down|logs|ps} [args...]"
    echo ""
    echo "Required env:"
    echo "  INFISICAL_TOKEN"
    echo "Optional env:"
    echo "  INFISICAL_ENVIRONMENT=dev|stg|prod (or your custom slug; default: prod)"
    echo ""
    echo "Compose file options:"
    echo "  COMPOSE_FILE=docker-compose.local.yml   (includes Postgres container on :5433)"
    echo "  COMPOSE_FILE=docker-compose.hostdb.yml  (uses host Postgres via host.docker.internal)"
    exit 1
    ;;
esac
