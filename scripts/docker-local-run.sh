#!/usr/bin/env bash
set -euo pipefail

MODE=${MODE:-hostdb} # hostdb | localdb
NET_NAME=${NET_NAME:-simulacra-net}

APP_IMAGE=${APP_IMAGE:-simulacra/app:local}
STEIN_IMAGE=${STEIN_IMAGE:-simulacra/stein:local}

APP_CONTAINER=${APP_CONTAINER:-simulacra-app-local}
STEIN_CONTAINER=${STEIN_CONTAINER:-simulacra-stein-local}
DB_CONTAINER=${DB_CONTAINER:-simulacra-postgres-local}

INFISICAL_ENVIRONMENT=${INFISICAL_ENVIRONMENT:-dev}

# Auto-load local Infisical env file if present (so you can just run the script).
if [ -f ".env.infiscal" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.infiscal
  set +a
elif [ -f ".env.infisical" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.infisical
  set +a
fi

# Accept a common misspelling for convenience.
if [ -z "${INFISICAL_TOKEN:-}" ] && [ -n "${INFISCAL_TOKEN:-}" ]; then
  export INFISICAL_TOKEN="$INFISCAL_TOKEN"
fi

if [ -z "${INFISICAL_TOKEN:-}" ] && [ -z "${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:-}" -o -z "${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:-}" ]; then
  echo "Error: provide INFISICAL_TOKEN or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" >&2
  exit 1
fi

is_linux() {
  [ "$(uname -s)" = "Linux" ]
}

ensure_net() {
  if ! docker network inspect "$NET_NAME" >/dev/null 2>&1; then
    echo "[net] creating docker network '$NET_NAME'"
    docker network create "$NET_NAME" >/dev/null
  fi
}

cleanup_containers() {
  docker rm -f "$APP_CONTAINER" "$STEIN_CONTAINER" "$DB_CONTAINER" >/dev/null 2>&1 || true
}

build_images() {
  echo "[build] building Colyseus image: $STEIN_IMAGE"
  docker build -f Dockerfile.colyseus -t "$STEIN_IMAGE" .

  # These envs are baked into the Next.js client bundle at build time.
  local next_public_colyseus_url=${NEXT_PUBLIC_COLYSEUS_URL:-ws://localhost:3004}
  local next_public_colyseus_http=${NEXT_PUBLIC_COLYSEUS_HTTP_BASE:-http://localhost:3004}
  local next_public_app_url=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}

  echo "[build] building Next.js image: $APP_IMAGE"
  docker build -f Dockerfile.nextjs -t "$APP_IMAGE" \
    --build-arg NEXT_PUBLIC_COLYSEUS_URL="$next_public_colyseus_url" \
    --build-arg NEXT_PUBLIC_COLYSEUS_HTTP_BASE="$next_public_colyseus_http" \
    --build-arg NEXT_PUBLIC_APP_URL="$next_public_app_url" \
    .
}

run_db_localdb() {
  # Expose host port 5433 to avoid colliding with host Postgres.
  echo "[db] starting postgres container '$DB_CONTAINER' on localhost:5433"
  docker run -d --name "$DB_CONTAINER" --network "$NET_NAME" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=simulacra_local \
    -p 5433:5432 \
    postgres:16-alpine >/dev/null
}

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    if [ "$MODE" = "hostdb" ]; then
      # Preferred on Linux: host networking (so localhost works).
      if is_linux; then
        # Some environments store a docker-desktop style URL in secrets (host.docker.internal),
        # but that hostname doesn't resolve on Linux host networking.
        local rewritten="$DATABASE_URL"
        rewritten="$(echo "$rewritten" | sed -e 's#host\\.docker\\.internal#localhost#g')"
        if [ "$rewritten" != "$DATABASE_URL" ]; then
          echo "[db] rewrote DATABASE_URL host from host.docker.internal -> localhost" >&2
        fi
        echo "$rewritten"
        return
      fi

      # Docker Desktop: rewrite localhost -> host.docker.internal.
      local rewritten="$DATABASE_URL"
      rewritten="$(echo "$rewritten" | sed \
        -e 's#://localhost#://host.docker.internal#g' \
        -e 's#://127\\.0\\.0\\.1#://host.docker.internal#g' \
        -e 's#@localhost#@host.docker.internal#g' \
        -e 's#@127\\.0\\.0\\.1#@host.docker.internal#g')"
      if [ "$rewritten" != "$DATABASE_URL" ]; then
        echo "[db] rewrote DATABASE_URL host from localhost -> host.docker.internal" >&2
      fi
      echo "$rewritten"
      return
    fi

    echo "$DATABASE_URL"
    return
  fi

  if [ "$MODE" = "localdb" ]; then
    echo "postgresql://postgres:postgres@${DB_CONTAINER}:5432/simulacra_local?schema=public"
    return
  fi

  # hostdb mode: default to host Postgres + local db name.
  if is_linux; then
    echo "postgresql://postgres@localhost:5432/simulacra_local?schema=public"
  else
    echo "postgresql://postgres@host.docker.internal:5432/simulacra_local?schema=public"
  fi
}

run_services() {
  local use_host_network=0
  if [ "$MODE" = "hostdb" ] && is_linux; then
    use_host_network=1
  fi

  if [ "$use_host_network" = "0" ]; then
    ensure_net
  fi
  cleanup_containers

  if [ "${SKIP_BUILD:-0}" != "1" ]; then
    build_images
  fi

  if [ "$MODE" = "localdb" ]; then
    run_db_localdb
  fi

  local network_args=()
  local extra_host_args=()
  if [ "$use_host_network" = "1" ]; then
    network_args+=(--network host)
  else
    network_args+=(--network "$NET_NAME")
    if [ "$MODE" = "hostdb" ]; then
      extra_host_args+=(--add-host=host.docker.internal:host-gateway)
    fi
  fi

  local database_url=""
  local database_env_args=()
  database_url="$(resolve_database_url)"
  if [ -n "$database_url" ]; then
    database_env_args+=(-e DATABASE_URL="$database_url")
  fi

  echo "[stein] starting $STEIN_CONTAINER on localhost:3004"
  docker run -d --name "$STEIN_CONTAINER" "${network_args[@]}" "${extra_host_args[@]}" \
    -e NODE_ENV=production \
    -e PORT=$([ "$use_host_network" = "1" ] && echo 3004 || echo 3000) \
    -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
    ${INFISICAL_TOKEN:+-e INFISICAL_TOKEN="$INFISICAL_TOKEN"} \
    ${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:+-e INFISICAL_UNIVERSAL_AUTH_CLIENT_ID="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID"} \
    ${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:+-e INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET"} \
    ${INFISICAL_WORKSPACE_ID:+-e INFISICAL_WORKSPACE_ID="$INFISICAL_WORKSPACE_ID"} \
    ${INFISICAL_PROJECT_ID:+-e INFISICAL_PROJECT_ID="$INFISICAL_PROJECT_ID"} \
    ${INFISICAL_SITE_URL:+-e INFISICAL_SITE_URL="$INFISICAL_SITE_URL"} \
    -e INFISICAL_ENVIRONMENT="$INFISICAL_ENVIRONMENT" \
    "${database_env_args[@]}" \
    $([ "$use_host_network" = "1" ] && echo "" || echo "-p 3004:3000") \
    "$STEIN_IMAGE" >/dev/null

  echo "[app] starting $APP_CONTAINER on localhost:3000"
  docker run -d --name "$APP_CONTAINER" "${network_args[@]}" "${extra_host_args[@]}" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    ${INFISICAL_TOKEN:+-e INFISICAL_TOKEN="$INFISICAL_TOKEN"} \
    ${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:+-e INFISICAL_UNIVERSAL_AUTH_CLIENT_ID="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID"} \
    ${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:+-e INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET"} \
    ${INFISICAL_WORKSPACE_ID:+-e INFISICAL_WORKSPACE_ID="$INFISICAL_WORKSPACE_ID"} \
    ${INFISICAL_PROJECT_ID:+-e INFISICAL_PROJECT_ID="$INFISICAL_PROJECT_ID"} \
    ${INFISICAL_SITE_URL:+-e INFISICAL_SITE_URL="$INFISICAL_SITE_URL"} \
    -e INFISICAL_ENVIRONMENT="$INFISICAL_ENVIRONMENT" \
    "${database_env_args[@]}" \
    $([ "$use_host_network" = "1" ] && echo "" || echo "-p 3000:3000") \
    "$APP_IMAGE" >/dev/null

  echo ""
  echo "Next.js:  http://localhost:3000"
  echo "Colyseus: http://localhost:3004/healthz"
  echo ""
  echo "Logs:"
  echo "  docker logs -f $APP_CONTAINER"
  echo "  docker logs -f $STEIN_CONTAINER"
}

case "${1:-}" in
  up)
    shift || true
    # allow env-style args after the command (KEY=value)
    for arg in "$@"; do
      case "$arg" in
        MODE=*|NET_NAME=*|DATABASE_URL=*|INFISICAL_ENVIRONMENT=*|INFISICAL_TOKEN=*|SKIP_BUILD=*|APP_IMAGE=*|STEIN_IMAGE=*)
          export "${arg?}"
          ;;
        INFISCAL_TOKEN=*)
          export "${arg?}"
          ;;
        INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=*|INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=*|INFISICAL_WORKSPACE_ID=*|INFISICAL_PROJECT_ID=*|INFISICAL_SITE_URL=*)
          export "${arg?}"
          ;;
      esac
    done
    run_services
    ;;
  down)
    ensure_net
    cleanup_containers
    docker network rm "$NET_NAME" >/dev/null 2>&1 || true
    ;;
  *)
    echo "Usage: $0 up|down"
    echo ""
    echo "Required env:"
    echo "  INFISICAL_TOKEN"
    echo "Optional:"
    echo "  MODE=hostdb|localdb (default: hostdb)"
    echo "  DATABASE_URL=... (overrides default for MODE)"
    echo "  INFISICAL_ENVIRONMENT=dev|stg|prod (or your custom slug; default: prod)"
    echo "  SKIP_BUILD=1 (to reuse existing images)"
    exit 1
    ;;
esac
