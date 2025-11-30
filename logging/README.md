# Unified Logging Infrastructure

This directory contains the logging stack configuration for local development and production deployment.

## Architecture

```
┌─────────────────┐
│ Next.js App     │──┐
│ (browser logs)  │  │
└─────────────────┘  │
                     │  HTTP POST
┌─────────────────┐  │  /api/logs
│ Colyseus Server │──┼────────────► ┌──────────┐    ┌──────────┐    ┌──────────┐
│ (server logs)   │  │              │   Pino   │───►│ Promtail │───►│   Loki   │
└─────────────────┘  │              │ (stdout) │    │ (scrape) │    │ (storage)│
                     │              └──────────┘    └──────────┘    └────┬─────┘
                     │                                                    │
                     └────────────────────────────────────────────────────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────┐
                                                                    │ Grafana  │
                                                                    │ (query)  │
                                                                    └──────────┘
```

All logs (browser + server) flow through Pino → stdout → Promtail → Loki → Grafana.

## Quick Start

### 1. Start the Logging Stack

```bash
cd logging
docker-compose -f docker-compose.logging.yml up -d
```

This starts:
- **Loki** on port 3100 (log storage)
- **Promtail** (log shipper from Docker containers)
- **Grafana** on port 3500 (visualization)

### 2. Access Grafana

Open http://localhost:3500

- No login required (anonymous auth enabled for dev)
- Loki datasource is auto-provisioned
- Click "Explore" → select "Loki" to query logs

### 3. Label Your Application Containers

For Promtail to scrape your logs, add these labels to your app's docker-compose:

```yaml
services:
  app:
    image: your-app:latest
    labels:
      - "logging=promtail"        # Required: tells Promtail to scrape this container
      - "app.env=dev"             # Environment (dev/staging/prod)
      - "app.name=simulacra"      # Application name
    # ... rest of config
```

## Querying Logs in Grafana

### By Service

```logql
{service="colyseus-server"}
{service="web-client"}
```

### By Environment

```logql
{env="dev"}
{env="prod"}
```

### By Game/Room

```logql
{gameId="ZYM489"}
{roomId="M5TAYNdy4"}
```

### By Phase and Round

```logql
{phase="action", round="3"}
```

### Combined Filters

```logql
{service="colyseus-server", gameId="ZYM489"} |= "error"
```

### Time Range Queries

Grafana UI provides time range selectors. Common patterns:

```logql
# All logs from a specific game in the last hour
{gameId="ZYM489"}

# Errors in production in the last 24 hours
{env="prod"} |= "error"

# All ACTION phase logs for a specific room
{roomId="M5TAYNdy4", phase="action"}
```

## Standard Log Labels

All logs include these labels for filtering:

### Base Labels (always present)
- **service**: `colyseus-server` | `web-client`
- **env**: `development` | `production` (from NODE_ENV)

### Game Context Labels (when available)
- **gameId**: Shareable room code (e.g., "ZYM489")
- **roomId**: Colyseus internal room ID
- **phase**: Game phase (`lobby` | `action` | `consequence` | `end`)
- **round**: Current round number
- **rid**: Request ID for tracing

### Browser Logs Additional Fields
- **source**: `browser`
- **url**: Browser URL when log was created
- **timestamp**: ISO timestamp from client

## Configuration Files

### `promtail-config.yaml`
Configures Promtail to:
- Scrape Docker container logs via Docker socket
- Filter containers with `logging=promtail` label
- Parse JSON logs (Pino format)
- Extract structured fields (gameId, roomId, phase, etc.) as labels
- Ship to Loki

### `docker-compose.logging.yml`
Defines the logging stack:
- Loki: log aggregation storage
- Promtail: log shipper
- Grafana: visualization UI

### `grafana-datasources.yaml`
Auto-provisions Loki as a datasource in Grafana on startup.

## Production Deployment

### Environment Variables

Set these in production:

```bash
NODE_ENV=production           # Sets env label to 'production'
LOG_LEVEL=info               # Pino log level (debug/info/warn/error)
```

### Loki Backend

For production, update `promtail-config.yaml` clients section:

```yaml
clients:
  - url: https://your-loki-instance.com/loki/api/v1/push
    basic_auth:
      username: <loki-username>
      password: <loki-password>
```

### Docker Labels in Production

Ensure your production containers have the correct labels:

```yaml
services:
  app:
    labels:
      - "logging=promtail"
      - "app.env=prod"
      - "app.name=simulacra"
```

## Development Workflow

### View Logs Locally

**Option 1: Grafana (recommended)**
```bash
# Start stack
cd logging && docker-compose -f docker-compose.logging.yml up -d

# Open http://localhost:3500
# Explore → Loki → {service="colyseus-server"}
```

**Option 2: Direct stdout (simple debugging)**
```bash
# Server logs
PORT=3004 pnpm run dev:colyseus

# Browser logs
# Open browser DevTools → Console tab
```

### Stop the Stack

```bash
cd logging
docker-compose -f docker-compose.logging.yml down
```

To also remove volumes (clears stored logs):

```bash
docker-compose -f docker-compose.logging.yml down -v
```

## Troubleshooting

### Logs not appearing in Grafana

1. **Check Promtail is running**:
   ```bash
   docker-compose -f docker-compose.logging.yml ps
   ```

2. **Check container labels**:
   ```bash
   docker inspect <container-name> | grep -A5 Labels
   ```

   Should show `logging=promtail`.

3. **Check Promtail logs**:
   ```bash
   docker logs promtail
   ```

### Loki not receiving logs

1. **Test Promtail → Loki connection**:
   ```bash
   curl http://localhost:3100/ready
   ```

   Should return `ready`.

2. **Check Loki ingestion**:
   ```bash
   curl http://localhost:3100/loki/api/v1/label
   ```

   Should show available labels (service, env, etc.).

### Grafana not showing datasource

Restart Grafana to re-provision:

```bash
docker-compose -f docker-compose.logging.yml restart grafana
```

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/configuration/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Pino Logger](https://getpino.io/)
