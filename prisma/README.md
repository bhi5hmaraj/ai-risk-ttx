# Prisma Setup

This project uses Prisma with PostgreSQL for database management.

## Local Development

### 1. Setup Database

**Option A: Vercel Postgres (Recommended)**
1. Create a Vercel Postgres database: https://vercel.com/docs/storage/vercel-postgres/quickstart
2. Copy the `DATABASE_URL` connection string
3. Add to `.env`:
```bash
DATABASE_URL="postgres://..."
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# macOS: brew install postgresql
# Linux: apt-get install postgresql

# Create database
createdb crisis_command_dev

# Add to .env
DATABASE_URL="postgresql://username:password@localhost:5432/crisis_command_dev"
```

### 2. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Optional: Open Prisma Studio (GUI for viewing data)
npx prisma studio
```

### 3. Update after Schema Changes

```bash
# After editing schema.prisma
npx prisma migrate dev --name describe_your_changes

# Regenerate Prisma Client
npx prisma generate
```

## Vercel Deployment

### Environment Variables

Add to Vercel project settings:

```bash
DATABASE_URL="postgres://..."  # From Vercel Postgres
```

### Build Configuration

Vercel automatically runs `prisma generate` during build if it detects Prisma.

If needed, customize build command in `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && vite build"
  }
}
```

## Database Schema

### Current Models

**Feedback** - User feedback submissions
- Stores feedback data as JSON with schema versioning
- Denormalized fields for fast queries (model, scenarioType, avgRating)

**PublicScenario** - Community-shared scenarios
- User-created scenarios with upvotes
- Full scenario configuration as JSON

**ScenarioVote** - Upvote tracking
- Links users to scenarios they've upvoted
- Prevents duplicate votes via fingerprinting

## Useful Commands

```bash
# View database in browser
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Generate Prisma Client only
npx prisma generate

# Format schema file
npx prisma format

# Pull schema from existing database
npx prisma db pull

# Push schema changes without migration
npx prisma db push
```

## Common Issues

### "PrismaClient is unable to be run in the browser"
- Prisma can only be used in server-side code (API routes, server components)
- Never import `@prisma/client` in client-side React components

### "Environment variable not found: DATABASE_URL"
- Make sure `.env` file exists in project root
- Restart dev server after adding `.env`
- Vercel: Check environment variables in project settings

### Migration conflicts
```bash
# Resolve migration conflicts
npx prisma migrate resolve --applied <migration_name>
# or
npx prisma migrate reset  # WARNING: deletes all data
```

## Security Notes

- **Never commit `.env`** - It's in `.gitignore` by default
- **Use connection pooling** for serverless (Vercel automatically handles this)
- **Sanitize inputs** - Prisma protects against SQL injection, but always validate user input
- **Rotate credentials** - Regenerate database passwords periodically

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
