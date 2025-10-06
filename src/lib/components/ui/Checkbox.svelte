<script lang="ts">
  import { Check } from "@lucide/svelte";
  
  interface Props {
    checked?: boolean;
    color?: string;
    glowColor?: string;
    onclick?: () => void;
    disabled?: boolean;
  }
  
  let {
    checked = false,
    color = "var(--color-accent)",
    glowColor = "rgba(167, 139, 250, 0.4)",
    onclick,
    disabled = false
  }: Props = $props();
</script>

<button
  class="checkbox"
  class:checked
  class:disabled
  {onclick}
  {disabled}
  aria-checked={checked}
  role="checkbox"
  type="button"
  style="--checkbox-color: {color}; --checkbox-glow: {glowColor};"
>
  {#if checked}
    <Check size={14} strokeWidth={3} />
  {/if}
</button>

<style>
  .checkbox {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: transparent;
    flex-shrink: 0;
  }

  .checkbox:hover {
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.05);
  }

  .checkbox:active {
    transform: scale(0.95);
  }

  .checkbox.checked {
    border-color: var(--checkbox-color);
    background: var(--checkbox-color);
    color: #000000;
    box-shadow: 0 0 16px var(--checkbox-glow), 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .checkbox.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .checkbox.disabled:active {
    transform: none;
  }
</style>
