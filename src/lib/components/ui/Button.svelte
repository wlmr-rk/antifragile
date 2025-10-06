<script lang="ts">
  import type { Snippet } from "svelte";
  
  interface Props {
    children: Snippet;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    onclick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    class?: string;
  }
  
  let {
    children,
    variant = "primary",
    size = "md",
    onclick,
    disabled = false,
    type = "button",
    class: className = ""
  }: Props = $props();
</script>

<button
  class="btn {variant} {size} {className}"
  {onclick}
  {disabled}
  {type}
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  /* Sizes */
  .btn.sm {
    padding: 8px 16px;
    font-size: 14px;
    min-height: 36px;
  }

  .btn.md {
    padding: 12px 24px;
    min-height: 44px;
  }

  .btn.lg {
    padding: 16px 32px;
    font-size: 16px;
    min-height: 52px;
  }

  /* Variants */
  .btn.primary {
    background: linear-gradient(135deg, var(--color-accent), rgba(167, 139, 250, 0.9));
    color: #000000;
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(167, 139, 250, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.primary:hover {
    box-shadow: 
      0 6px 20px rgba(0, 0, 0, 0.5),
      0 0 24px rgba(167, 139, 250, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.primary:active {
    transform: scale(0.97);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 0 16px rgba(167, 139, 250, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.secondary {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--color-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .btn.secondary:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .btn.secondary:active {
    transform: scale(0.97);
    background: rgba(255, 255, 255, 0.08);
  }

  .btn.ghost {
    background: transparent;
    color: var(--color-text-secondary);
  }

  .btn.ghost:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-primary);
  }

  .btn.ghost:active {
    transform: scale(0.97);
    background: rgba(255, 255, 255, 0.06);
  }

  .btn.danger {
    background: linear-gradient(135deg, var(--color-error), rgba(248, 113, 113, 0.9));
    color: #000000;
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(248, 113, 113, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.danger:hover {
    box-shadow: 
      0 6px 20px rgba(0, 0, 0, 0.5),
      0 0 24px rgba(248, 113, 113, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.danger:active {
    transform: scale(0.97);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }
</style>
