<script lang="ts">
  import type { Snippet } from "svelte";
  
  interface Props {
    children: Snippet;
    variant?: "default" | "elevated" | "interactive";
    onclick?: () => void;
    class?: string;
  }
  
  let {
    children,
    variant = "default",
    onclick,
    class: className = ""
  }: Props = $props();
</script>

{#if onclick}
  <button class="card {variant} {className}" {onclick} type="button">
    {@render children()}
  </button>
{:else}
  <div class="card {variant} {className}">
    {@render children()}
  </div>
{/if}

<style>
  .card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card.elevated {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.7),
      0 2px 8px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .card.interactive {
    cursor: pointer;
    text-align: left;
  }

  .card.interactive:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .card.interactive:active {
    transform: scale(0.98);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
</style>
