#!/bin/bash

# Antifragile Todo List - Quick Start Script

echo "🚀 Antifragile Todo List - Setup & Start"
echo "========================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local file not found!"
    echo ""
    echo "📝 First-time setup required:"
    echo "   1. Run: bunx convex dev"
    echo "   2. Copy your Convex deployment URL"
    echo "   3. Create .env.local with: PUBLIC_CONVEX_URL=<your-url>"
    echo ""
    echo "💡 Or copy the example file:"
    echo "   cp .env.local.example .env.local"
    echo "   Then edit it with your Convex URL"
    echo ""
    exit 1
fi

# Check if _generated folder exists
if [ ! -d "src/convex/_generated" ]; then
    echo "⚠️  Convex hasn't been initialized yet!"
    echo ""
    echo "🔧 Run this command in a separate terminal:"
    echo "   bunx convex dev"
    echo ""
    echo "   (Keep that terminal running, then come back here and run this script again)"
    echo ""
    exit 1
fi

# Check if Convex is running
echo "✅ .env.local found"
echo "✅ Convex types generated"
echo ""

# Read the Convex URL
CONVEX_URL=$(grep PUBLIC_CONVEX_URL .env.local | cut -d '=' -f2)
echo "🔗 Convex URL: $CONVEX_URL"
echo ""

echo "🎯 Starting development server..."
echo ""
echo "⚠️  IMPORTANT: Make sure 'bunx convex dev' is running in another terminal!"
echo ""
echo "📱 Your app will be available at: http://localhost:5173"
echo ""

# Start the dev server
bun run dev
