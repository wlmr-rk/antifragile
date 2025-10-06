# Antifragile Todo List

A modern todo list application built with SvelteKit 5, Svelte 5 runes, and Convex for real-time database functionality.

## 🚀 Tech Stack

- **SvelteKit 5** - Full-stack web framework
- **Svelte 5** - Component framework with runes
- **Convex** - Real-time backend and database
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide Svelte** - Beautiful icon library
- **TypeScript** - Type-safe development

## ✨ Features

- ✅ Add, complete, and delete todos
- 🔄 Real-time synchronization with Convex
- 🎨 Beautiful, responsive UI with Tailwind CSS
- 🎯 Filter todos (All, Active, Completed)
- 🧹 Clear all completed todos at once
- 💾 Persistent storage with Convex database
- ⚡ Fast and reactive with Svelte 5 runes

## 📋 Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- [Convex](https://www.convex.dev/) account

## 🛠️ Setup Instructions

### 1. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
bun install
```

### 2. Set up Convex

1. Install Convex CLI globally (if not already installed):

   ```bash
   bun install -g convex
   ```

2. Log in to Convex:

   ```bash
   bunx convex login
   ```

3. Initialize Convex in your project:

   ```bash
   bunx convex dev
   ```

   This will:
   - Create a new Convex project (or link to an existing one)
   - Generate the necessary files in `convex/_generated`
   - Start the Convex development server
   - Give you a deployment URL

4. Copy the deployment URL and create a `.env.local` file:

   ```bash
   cp .env.local.example .env.local
   ```

5. Edit `.env.local` and add your Convex URL:
   ```
   PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

### 3. Run the Development Server

In a separate terminal (keep `convex dev` running), start the SvelteKit dev server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
antifragile/
├── convex/                    # Convex backend
│   ├── _generated/           # Auto-generated Convex files
│   ├── schema.ts             # Database schema
│   ├── todos.ts              # Todo CRUD operations
│   └── tsconfig.json         # Convex TypeScript config
├── src/
│   ├── lib/                  # Shared components and utilities
│   ├── routes/
│   │   ├── +layout.svelte   # Root layout with ConvexProvider
│   │   └── +page.svelte     # Todo list page
│   ├── app.css              # Global styles
│   └── app.html             # HTML template
├── .env.local               # Environment variables (not in git)
└── package.json             # Dependencies
```

## 🔧 Convex Functions

### Queries

- `getTodos` - Fetch all todos ordered by creation time

### Mutations

- `addTodo(text: string)` - Create a new todo
- `toggleTodo(id: Id<"todos">)` - Toggle todo completion status
- `deleteTodo(id: Id<"todos">)` - Delete a todo
- `clearCompleted()` - Delete all completed todos

## 🎯 Usage

1. **Add a todo**: Type in the input field and click "Add" or press Enter
2. **Complete a todo**: Click the checkbox next to a todo
3. **Delete a todo**: Click the trash icon
4. **Filter todos**: Use the "All", "Active", or "Completed" buttons
5. **Clear completed**: Click "Clear completed" to remove all finished todos

## 🚢 Deployment

### Deploy to Convex Production

```bash
bunx convex deploy
```

Update your production environment variables with the production Convex URL.

### Deploy SvelteKit

The app can be deployed to any platform that supports SvelteKit:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Cloudflare Pages**: Follow their SvelteKit guide

Make sure to set the `PUBLIC_CONVEX_URL` environment variable in your deployment platform.

## 📚 Learn More

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Convex Documentation](https://docs.convex.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📝 License

MIT
