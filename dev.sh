#!/bin/bash
# Development server with API routes

echo "Starting Simulacra Development Server..."
echo "This will run both the Vite frontend and Vercel API routes"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if database is running
if ! pg_isready -h localhost -p 5432 &>/dev/null; then
    echo "⚠️  Warning: PostgreSQL doesn't seem to be running on localhost:5432"
    echo "   API routes requiring database will fail"
    echo ""
fi

# Start Vercel dev
echo "Starting Vercel dev server..."
vercel dev --yes

