# Setup Guide

This guide will walk you through setting up the Antifragile Todo List application from scratch.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Bun** (recommended) or **Node.js 18+**
- **Git** (for version control)
- A **Convex account** (free to create at [convex.dev](https://www.convex.dev/))

## Step 1: Install Dependencies

If dependencies aren't already installed, run:

```bash
bun install
```

Or with npm:

```bash
npm install
```

## Step 2: Set Up Convex

### 2.1 Install Convex CLI Globally (Optional but Recommended)

```bash
bun install -g convex
```

Or with npm:

```bash
npm install -g convex
```

### 2.2 Initialize Convex Development

Run the Convex development server. This will guide you through authentication and project creation:

```bash
bunx convex dev
```

Or with npm:

```bash
npx convex dev
```

**What this does:**

1. **Prompts you to log in** with GitHub (if not already logged in)
2. **Creates a new Convex project** or lets you select an existing one
3. **Generates the `src/convex/_generated` folder** with TypeScript types
4. **Starts watching** your Convex functions for changes
5. **Provides your deployment URL** (something like `https://your-project.convex.cloud`)

**Important:** Keep this terminal window running! It needs to stay active to sync your Convex functions.

### 2.3 Note Your Convex Deployment URL

After running `convex dev`, you'll see output like:

```
✔ Deployed my-project to https://happy-animal-123.convex.cloud
```

Copy this URL - you'll need it in the next step.

## Step 3: Configure Environment Variables

### 3.1 Create .env.local File

Create a new file called `.env.local` in the project root:

```bash
touch .env.local
```

### 3.2 Add Your Convex URL

Open `.env.local` and add:

```
PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Replace `https://your-deployment.convex.cloud` with the actual URL from Step 2.3.

**Example:**

```
PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud
```

## Step 4: Start the Development Server

Open a **new terminal window** (keep `convex dev` running in the first one) and start the SvelteKit development server:

```bash
bun run dev
```

Or with npm:

```bash
npm run dev
```

## Step 5: Open the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the Todo List application! 🎉

## Verifying Everything Works

To make sure everything is set up correctly:

1. **Try adding a todo** - Type something in the input field and click "Add"
2. **Check the Convex Dashboard** - Go to [dashboard.convex.dev](https://dashboard.convex.dev) and check the "Data" tab. You should see your todos in the `todos` table
3. **Toggle completion** - Click the checkbox next to a todo
4. **Test filters** - Click "Active" and "Completed" to filter todos
5. **Delete a todo** - Click the trash icon

If all these work, you're good to go!

## Common Issues & Troubleshooting

### Issue: "Module not found: convex/_generated/api"

**Solution:** Make sure `convex dev` is running and has finished generating files. Check that the `src/convex/_generated` folder exists.

### Issue: "PUBLIC_CONVEX_URL is not defined"

**Solution:**
1. Make sure `.env.local` exists in the project root
2. Verify it contains `PUBLIC_CONVEX_URL=...`
3. Restart the SvelteKit dev server (`bun run dev`)

### Issue: Todos aren't persisting/syncing

**Solution:**
1. Check that `convex dev` is still running
2. Verify your `.env.local` has the correct Convex URL
3. Check the browser console for errors
4. Make sure you're connected to the internet

### Issue: TypeScript errors in Convex files

**Solution:**
1. Wait for `convex dev` to finish generating types
2. Restart your IDE/editor
3. Run `bunx convex dev --once` to force regeneration

### Issue: Port 5173 already in use

**Solution:** Either:
- Stop the other process using that port
- Or specify a different port: `bun run dev -- --port 3000`

## Project Structure Overview

```
antifragile/
├── src/
│   ├── convex/                 # Convex backend
│   │   ├── _generated/         # Auto-generated (don't edit)
│   │   ├── schema.ts           # Database schema
│   │   ├── todos.ts            # Todo CRUD functions
│   │   └── tsconfig.json       # Convex TS config
│   ├── routes/
│   │   ├── +layout.svelte     # Root layout (Convex setup)
│   │   └── +page.svelte       # Todo list UI
│   └── app.css                # Global styles
├── .env.local                 # Your Convex URL (not in git)
├── convex.json               # Convex configuration
└── package.json              # Dependencies
```

## Next Steps

Now that your todo list is running, you can:

1. **Customize the UI** - Edit `src/routes/+page.svelte` to change colors, layout, etc.
2. **Add new features** - Maybe add due dates, priorities, or categories?
3. **Add authentication** - Convex supports Auth0, Clerk, and custom auth
4. **Deploy to production** - See the main README.md for deployment instructions

## Development Workflow

When developing, you'll typically have **two terminal windows** open:

**Terminal 1:**
```bash
bunx convex dev
```
This watches your Convex functions and syncs them to the cloud.

**Terminal 2:**
```bash
bun run dev
```
This runs your SvelteKit development server.

## Useful Commands

```bash
# Run Convex development server
bunx convex dev

# Run SvelteKit dev server
bun run dev

# Deploy Convex to production
bunx convex deploy

# Build SvelteKit for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run check

# Clear Convex data (caution!)
bunx convex data clear
```

## Getting Help

- **Convex Docs:** https://docs.convex.dev
- **SvelteKit Docs:** https://kit.svelte.dev
- **Svelte 5 Docs:** https://svelte.dev/docs/svelte/overview
- **Convex Discord:** https://convex.dev/community

Happy coding! 🚀
