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
    gap: 12px;
    padding: 12px 16px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .todo-item.optimistic {
    opacity: 0.6;
  }

  .todo-item:active {
    transform: scale(0.98);
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
    border: 2px solid var(--color-border-strong);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    color: transparent;
    background: var(--color-surface-2);
    box-shadow: var(--shadow-inset);
  }

  .checkbox-inner.checked {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .todo-text {
    flex: 1;
    font-size: 15px;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all var(--transition-fast);
  }

  .todo-text.completed {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
  }

  .syncing-dot {
    width: 4px;
    height: 4px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  .delete-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
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
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-error);
    transform: scale(0.9);
  }
</style>
