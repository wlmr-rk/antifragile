<script lang="ts">
  import type { ComponentType } from "svelte";
  import type { Snippet } from "svelte";
  
  interface Props {
    icon?: ComponentType;
    children: Snippet;
  }
  
  let { icon, children }: Props = $props();
</script>

<div class="section-label">
  {#if icon}
    <svelte:component this={icon} size={14} strokeWidth={2.5} />
  {/if}
  <span>{@render children()}</span>
</div>

<style>
  .section-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 14px;
  }
</style>
