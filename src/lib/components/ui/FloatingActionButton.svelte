<script lang="ts">
  import { Plus } from "@lucide/svelte";
  
  interface Props {
    onclick?: () => void;
    label?: string;
  }
  
  let { onclick, label = "Add" }: Props = $props();
</script>

<button class="fab" {onclick} aria-label={label}>
  <Plus size={24} strokeWidth={2.5} />
</button>

<style>
  .fab {
    position: fixed;
    bottom: calc(var(--spacing-bottom-nav) + env(safe-area-inset-bottom, 0px) + 20px);
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-accent), rgba(167, 139, 250, 0.9));
    border: none;
    color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 32px rgba(167, 139, 250, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    animation: fabEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fab:hover {
    transform: scale(1.05);
    box-shadow: 
      0 12px 32px rgba(0, 0, 0, 0.7),
      0 0 40px rgba(167, 139, 250, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .fab:active {
    transform: scale(0.95) rotate(90deg);
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.5),
      0 0 24px rgba(167, 139, 250, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  @keyframes fabEnter {
    from {
      opacity: 0;
      transform: scale(0) rotate(-180deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
</style>
