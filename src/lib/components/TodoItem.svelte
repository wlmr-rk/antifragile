<script lang="ts">
  import { Check, Trash2 } from "@lucide/svelte";
  import type { Id } from "../../convex/_generated/dataModel";

  interface Props {
    id: Id<"todos"> | string;
    text: string;
    isCompleted: boolean;
    isOptimistic?: boolean;
    onToggle: (id: Id<"todos"> | string) => void;
    onDelete: (id: Id<"todos"> | string) => void;
  }

  let {
    id,
    text,
    isCompleted,
    isOptimistic = false,
    onToggle,
    onDelete,
  }: Props = $props();
</script>

<li class="todo-item {isOptimistic ? 'optimistic' : ''}">
  <button
    onclick={() => onToggle(id)}
    class="todo-checkbox"
    aria-label="Toggle todo completion"
  >
    <div class="checkbox-inner {isCompleted ? 'checked' : ''}">
      {#if isCompleted}
        <Check size={14} />
      {/if}
    </div>
  </button>
  <span class="todo-text {isCompleted ? 'completed' : ''}">
    {text}
    {#if isOptimistic}
      <span class="syncing-dot" title="Syncing..."></span>
    {/if}
  </span>
  <button
    onclick={() => onDelete(id)}
    class="delete-btn"
    aria-label="Delete todo"
  >
    <Trash2 size={16} />
  </button>
</li>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: var(--glass-surface-1);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .todo-item.optimistic {
    opacity: 0.5;
  }

  .todo-item:active {
    transform: scale(0.98);
    background: var(--glass-surface-2);
  }

  .todo-checkbox {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .checkbox-inner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-glass-strong);
    border-radius: var(--radius-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    color: transparent;
    background: var(--glass-surface-1);
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
    box-shadow: var(--shadow-inset);
  }

  .checkbox-inner.checked {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
    box-shadow: var(--shadow-sm), var(--glow-accent);
  }

  .todo-text {
    flex: 1;
    font-size: 15px;
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all var(--transition-fast);
    letter-spacing: -0.01em;
  }

  .todo-text.completed {
    color: var(--color-text-muted);
    text-decoration: line-through;
  }

  .syncing-dot {
    width: 4px;
    height: 4px;
    background: var(--color-accent);
    border-radius: 50%;
    box-shadow: 0 0 4px var(--color-accent);
    animation: pulse 2s ease-in-out infinite;
  }

  .delete-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .delete-btn:active {
    background: rgba(239, 68, 68, 0.12);
    color: var(--color-error);
    transform: scale(0.92);
  }
</style>
