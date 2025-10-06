<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import { setupConvex } from "convex-svelte";
  import "../app.css";

  const { children } = $props();

  setupConvex(PUBLIC_CONVEX_URL);

  // Register service worker for PWA
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }
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
  <meta name="apple-mobile-web-app-title" content="Antifragile" />
  <meta name="description" content="Cyberpunk productivity app for todos, habits, fitness, and focus" />
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />
  
  <!-- Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  
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
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-rows: 1fr auto;
    background-color: var(--color-bg-primary);
  }

  .main-content {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }
</style>
