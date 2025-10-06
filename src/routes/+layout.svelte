<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import { setupConvex } from "convex-svelte";
  import "../app.css";

  const { children } = $props();

  setupConvex(PUBLIC_CONVEX_URL);
</script>

<svelte:head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
  />
  <meta name="theme-color" content="#000000" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta
    name="apple-mobile-web-app-status-bar-style"
    content="black-translucent"
  />
  <title>Antifragile - Productivity</title>
</svelte:head>

<div class="app-container">
  <main class="main-content">
    {@render children()}
  </main>

  <BottomNav currentPath={$page.url.pathname} />
</div>

<style>
  .app-container {
    min-height: 100vh;
    min-height: -webkit-fill-available;
    background-color: var(--color-bg-primary);
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    padding-bottom: calc(
      var(--spacing-bottom-nav) + env(safe-area-inset-bottom, 0px) + 16px
    );
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Prevent pull-to-refresh on iOS when not intended */
  .main-content {
    overscroll-behavior-y: contain;
  }
</style>
