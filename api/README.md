# API Documentation

Serverless API routes for Crisis Command, deployed on Vercel.

## Endpoints

### POST /api/feedback

Submit user feedback after gameplay.

**Request Body:**
```typescript
{
  schemaVersion: "1.0.0",
  ratings: {
    ui: number,                    // 1-10
    gameDynamics: number,          // 1-10
    modelQuality: number,          // 1-10
    scenario: number,              // 1-10
    actions: number,               // 1-10
    stakeholders: number           // 1-10
  },
  gameMetadata: {
    model: string,                 // e.g., "gpt-4o-mini"
    scenarioType: "classic" | "ai_safety" | "custom",
    rolePlayed: string,
    roundsCompleted: number,
    finalPublicScore: number | null,
    customPromptUsed: boolean,
    customPrompt?: string
  },
  responses: {
    scenarioUsefulness?: string,
    counterfactualTime?: string,
    improvements?: string
  },
  demographics: {
    background: ("tech" | "policy" | "creative")[]
  },
  contact: {
    email?: string,
    wantsCollaboration: boolean
  },
  meta: {
    sessionId: string,
    submittedAt: string            // ISO 8601
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "id": "clxyz123...",
  "message": "Feedback submitted successfully"
}
```

**Error Responses:**

400 Bad Request - Invalid data
```json
{
  "error": "Invalid feedback data",
  "details": [ /* Zod validation errors */ ]
}
```

500 Internal Server Error
```json
{
  "error": "Failed to submit feedback",
  "message": "Error details..."
}
```

**Example Usage:**
```typescript
import { submitFeedback } from '@/services/feedbackService';

const result = await submitFeedback(feedbackData);

if (result.success) {
  console.log('Submitted with ID:', result.id);
} else {
  console.error('Error:', result.error);
}
```

## Local Development

Since API routes are serverless functions, you'll need Vercel CLI for local testing:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Run local dev server with serverless functions
vercel dev
```

This will start a local server that simulates the Vercel environment, including API routes.

Alternatively, for frontend-only development:
```bash
npm run dev  # Vite dev server (API routes won't work)
```

## Database Connection

API routes automatically connect to the database via `DATABASE_URL` environment variable.

**Local:**
- Set `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running

**Vercel:**
- Vercel Postgres automatically injects `DATABASE_URL`
- No manual configuration needed

## Error Handling

All API routes follow this pattern:

1. Validate request method
2. Validate request body with Zod
3. Perform database operation
4. Return success/error response
5. Always disconnect Prisma client in `finally` block

## Security Considerations

- **CORS:** Vercel automatically handles CORS for same-origin requests
- **Rate Limiting:** Consider adding Vercel Edge Middleware for rate limiting
- **Input Validation:** All inputs validated with Zod schemas
- **SQL Injection:** Prisma provides automatic protection
- **Environment Variables:** Never expose `DATABASE_URL` to client

## Future Endpoints

Planned API routes (not yet implemented):

- `GET /api/scenarios` - List public scenarios
- `POST /api/scenarios` - Create public scenario
- `POST /api/scenarios/:id/vote` - Upvote a scenario
- `GET /api/feedback/stats` - Admin analytics (requires auth)

## Deployment

API routes are automatically deployed with the Vercel project.

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_LITELLM_API_KEY` - LLM API key
- `VITE_LLM_MODEL` - LLM model name

**Build Process:**
1. `npm install` - Install dependencies
2. `prisma generate` - Generate Prisma Client (via postinstall)
3. `npm run build` - Build Vite frontend
4. API routes compiled automatically by Vercel

## Monitoring

View API logs in Vercel dashboard:
1. Go to project → Functions
2. Click on function name (e.g., `api/feedback`)
3. View invocation logs and errors

## Testing

```bash
# Test feedback submission locally (requires vercel dev)
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d @test-feedback.json

# Test on production
curl -X POST https://your-app.vercel.app/api/feedback \
  -H "Content-Type: application/json" \
  -d @test-feedback.json
```
