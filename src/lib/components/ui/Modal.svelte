<script lang="ts">
  import type { Snippet } from "svelte";
  import { X } from "@lucide/svelte";
  
  interface Props {
    open?: boolean;
    onClose?: () => void;
    title?: string;
    children: Snippet;
  }
  
  let { open = false, onClose, title, children }: Props = $props();
</script>

{#if open}
  <div 
    class="modal-overlay" 
    onclick={onClose}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && onClose?.()}
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-header">
        {#if title}
          <h2 class="modal-title">{title}</h2>
        {/if}
        <button class="modal-close" onclick={onClose} aria-label="Close">
          <X size={24} strokeWidth={2} />
        </button>
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    bottom: calc(var(--spacing-bottom-nav) + env(safe-area-inset-bottom, 0px));
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    width: 100%;
    max-height: calc(100vh - var(--spacing-bottom-nav) - env(safe-area-inset-bottom, 0px));
    background: linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(10, 10, 10, 0.98));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px 24px 0 0;
    display: flex;
    flex-direction: column;
    box-shadow: 
      0 -20px 60px rgba(0, 0, 0, 0.9),
      0 -8px 24px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .modal-close {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-close:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.08);
  }

  .modal-body {
    padding: 20px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
</style>
