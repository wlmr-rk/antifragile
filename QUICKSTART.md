# Quick Start Guide

Get your todo list running in 5 minutes! ⚡

## Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- [Convex account](https://www.convex.dev/) (free)

## Step 1: Initialize Convex (Terminal 1)

```bash
bunx convex dev
```

This will:
1. Prompt you to log in with GitHub
2. Create/select a Convex project
3. Give you a deployment URL like: `https://happy-animal-123.convex.cloud`
4. Start watching your functions

**Keep this terminal running!** ⚠️

## Step 2: Configure Environment

Create `.env.local` in the project root:

```bash
echo "PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud" > .env.local
```

Replace `https://your-deployment.convex.cloud` with your actual URL from Step 1.

## Step 3: Start Dev Server (Terminal 2)

Open a new terminal and run:

```bash
bun run dev
```

## Step 4: Open App

Visit: **http://localhost:5173**

## That's It! 🎉

Your todo list is now running with real-time sync!

## Quick Commands

```bash
# Development (needs 2 terminals)
bunx convex dev              # Terminal 1: Convex sync
bun run dev                  # Terminal 2: SvelteKit server

# Deploy to production
bunx convex deploy           # Deploy Convex functions
bun run build                # Build SvelteKit app

# Utilities
bun run check               # Type checking
bunx convex data clear      # Clear all data (caution!)
```

## Project Structure

```
src/
├── convex/                 # Backend functions
│   ├── schema.ts          # Database schema
│   └── todos.ts           # CRUD operations
└── routes/
    ├── +layout.svelte     # Convex setup
    └── +page.svelte       # Todo list UI
```

## Need Help?

- 📖 [Full Setup Guide](SETUP.md)
- 🎯 [Features Documentation](FEATURES.md)
- 🌐 [Convex Docs](https://docs.convex.dev)
- 🔥 [Svelte 5 Docs](https://svelte.dev/docs/svelte/overview)

## Troubleshooting

**"Module not found: convex/_generated/api"**
→ Make sure `bunx convex dev` is running and has finished generating files.

**"PUBLIC_CONVEX_URL is not defined"**
→ Check that `.env.local` exists and contains your Convex URL. Restart dev server.

**"Port already in use"**
→ Use a different port: `bun run dev -- --port 3000`

---

**Pro Tip:** Bookmark `http://localhost:5173` and the [Convex Dashboard](https://dashboard.convex.dev) for easy access!
