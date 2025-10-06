<script lang="ts">
  import {
    BarChart3,
    CheckSquare,
    Dumbbell,
    Grid3x3,
    Target,
  } from "@lucide/svelte";

  interface Props {
    currentPath: string;
  }

  let { currentPath }: Props = $props();

  const navItems = [
    {
      id: "dashboard",
      path: "/",
      icon: BarChart3,
      label: "Dashboard",
    },
    {
      id: "todos",
      path: "/todos",
      icon: CheckSquare,
      label: "Todos",
    },
    {
      id: "habits",
      path: "/habits",
      icon: Target,
      label: "Habits",
    },
    {
      id: "focus",
      path: "/focus",
      icon: Grid3x3,
      label: "Focus",
    },
    {
      id: "fitness",
      path: "/fitness",
      icon: Dumbbell,
      label: "Fitness",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };
</script>

<nav class="bottom-nav">
  <div class="nav-content">
    {#each navItems as item (item.id)}
      {#snippet navItem()}
        {@const active = isActive(item.path)}
        {@const Icon = item.icon}
        <a
          href={item.path}
          class="nav-item {active ? 'active' : ''}"
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
        >
          <div class="nav-item-icon">
            <Icon size={24} strokeWidth={2} />
            {#if active}
              <div class="active-indicator"></div>
            {/if}
          </div>
          <span class="nav-item-label">{item.label}</span>
        </a>
      {/snippet}
      {@render navItem()}
    {/each}
  </div>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(var(--blur-lg));
    -webkit-backdrop-filter: blur(var(--blur-lg));
    border-top: 1px solid var(--border-glass-strong);
    box-shadow: var(--shadow-glass-lg);
    z-index: 1000;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 68px;
    max-width: 100%;
    margin: 0 auto;
    padding: 0 12px;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex: 1;
    height: 100%;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: all var(--transition-fast);
    position: relative;
    padding: 8px;
    border-radius: var(--radius-md);
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item:active {
    transform: scale(0.94);
    background: var(--glass-surface-1);
  }

  .nav-item.active {
    color: var(--color-accent);
  }

  .nav-item-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .active-indicator {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 3px;
    background: var(--color-accent);
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.8);
    animation: slideDown 0.25s ease-out;
  }

  .nav-item-label {
    font-size: 10px;
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.03em;
    transition: all var(--transition-fast);
  }

  .nav-item.active .nav-item-label {
    font-weight: var(--font-weight-semibold);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (min-width: 768px) {
    .nav-content {
      max-width: 600px;
    }
  }
</style>
