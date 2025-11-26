## Deployment Configuration

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start Express server (Colyseus + Next handler)
  CMD ["npm", "start"]
```

### Cloud Run Configuration

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: simulacra
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"  # Prevent cold starts
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containerConcurrency: 1000  # Handles 1000 WebSocket connections per instance
      timeoutSeconds: 3600  # 60 min (long enough for games)
      containers:
      - image: gcr.io/your-project/simulacra
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: COLYSEUS_ROLLOUT_PERCENT
          value: "50"  # Adjust for gradual rollout
        - name: ADMIN_SECRET
          valueFrom:
            secretKeyRef:
              name: admin-secret
              key: password
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        - name: LITELLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: litellm-api-key
              key: key
        resources:
          limits:
            memory: 2Gi
            cpu: "2"
```

#### Cloud Run Timeout + Reconnection (EAGx profile)

- Constraints
  - WebSockets are bound by Cloud Run’s request timeout. Max 3600s (60 minutes); connections drop at timeout even with activity/keep‑alives.
  - For EAGx, keep deployment simple with a single instance to avoid cross‑instance room routing.

- Recommended settings (event window)
  - `--timeout 3600` — allow the longest WS sessions we can.
  - `--min-instances 1` — keep the process warm to avoid cold starts.
  - `--max-instances 1` — pin rooms to one process for the event; revisit after.
  - `--concurrency 100` — sufficient for ~5–10 concurrent games and ~100 peak users.
  - Memory 1–2 GiB depending on room/state size.

- Server reconnection (Colyseus)
  - Allow reconnect on ungraceful disconnects (covers the 60‑min cut and brief network blips):
    ```ts
    // GameRoom.ts
    onLeave(client: Client, consented: boolean) {
      if (!consented) {
        this.allowReconnection(client, 120).catch(() => {
          this.state.players.delete(client.sessionId);
        });
        return;
      }
      this.state.players.delete(client.sessionId);
    }
    ```

- Client reconnection
  - Persist reconnection data and auto‑reconnect on close:
    ```ts
    // After join
    localStorage.setItem('roomId', room.id);
    localStorage.setItem('reconnToken', room.reconnectionToken);

    // On socket close
    const roomId = localStorage.getItem('roomId');
    const token = localStorage.getItem('reconnToken');
    if (roomId && token) {
      client.reconnect(roomId, token).then((newRoom) => {
        room = newRoom;
        bindHandlers(room);
      }).catch(() => {/* show reconnect UI */});
    }
    ```

- Acceptance checks (staging)
  - Kill‑tab test: close the tab mid‑game; client rejoins within 5s with state and role intact.
  - 60‑minute cut test: at `--timeout 3600`, simulate/drop and ensure reconnect path works.
  - Deploy drain test: starting a new revision drops sockets; clients reconnect and rebind without losing progress.

- Ops runbook (event)
  - Avoid deploys during active rooms; confirm “active rooms = 0” before rolling.
  - Keep `max-instances=1` during EAGx; plan presence/redis + multi‑instance after the event if needed.

**Deployment Command:**
```bash
# Build and push image
docker build -t gcr.io/your-project/simulacra .
docker push gcr.io/your-project/simulacra

# Deploy to Cloud Run
gcloud run services replace cloud-run.yaml \
  --platform managed \
  --region us-central1
```

---

