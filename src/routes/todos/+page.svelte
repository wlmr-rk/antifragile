<script lang="ts">
  import {
    Calendar,
    CheckCircle,
    ListTodo,
    Repeat,
    Trash2,
  } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import {
    Button,
    Checkbox,
    Input,
    Textarea,
    FloatingActionButton,
    Modal,
  } from "$lib/components/ui";

  let newTodoText = $state("");
  let showAddModal = $state(false);
  let selectedDueDate = $state<number | undefined>(undefined);
  let isDaily = $state(false);
  let selectedPriority = $state<"low" | "medium" | "high" | undefined>(
    undefined,
  );
  let filter: "all" | "active" | "completed" | "daily" = $state("all");

  const client = useConvexClient();
  const todos = useQuery(api.todos.getTodos, () => ({
    includeCompleted: filter === "all" || filter === "completed",
    filterDaily: filter === "daily" ? true : undefined,
  }));

  const dailySummary = useQuery(api.todos.getDailyTasksSummary, {});

  // Optimistic state
  type OptimisticTodo = {
    _id: Id<"todos"> | string;
    text: string;
    isCompleted: boolean;
    createdAt: number;
    dueDate?: number;
    isDaily: boolean;
    priority?: "low" | "medium" | "high";
    isOptimistic?: boolean;
  };

  let optimisticAdds = $state<OptimisticTodo[]>([]);
  let optimisticDeletes = $state<Set<Id<"todos">>>(new Set());
  let optimisticToggles = $state<Set<Id<"todos">>>(new Set());

  const mergedTodos = $derived(() => {
    const serverTodos = todos.data || [];
    let result = serverTodos.filter((todo) => !optimisticDeletes.has(todo._id));

    result = result.map((todo) => {
      if (optimisticToggles.has(todo._id)) {
        return { ...todo, isCompleted: !todo.isCompleted };
      }
      return todo;
    });

    result = [...optimisticAdds, ...result];
    return result;
  });

  const filteredTodos = $derived(() => {
    const todoList = mergedTodos();
    if (filter === "active") {
      return todoList.filter((todo) => !todo.isCompleted);
    } else if (filter === "completed") {
      return todoList.filter((todo) => todo.isCompleted);
    } else if (filter === "daily") {
      return todoList.filter((todo) => todo.isDaily);
    }
    return todoList;
  });

  const activeCount = $derived(() => {
    return mergedTodos().filter((todo) => !todo.isCompleted).length;
  });

  const overdueCount = $derived(() => {
    const now = Date.now();
    return mergedTodos().filter(
      (todo) => !todo.isCompleted && todo.dueDate && todo.dueDate < now,
    ).length;
  });

  async function handleAddTodo(e: Event) {
    e.preventDefault();
    const trimmedText = newTodoText.trim();
    if (!trimmedText) return;

    const text = trimmedText;
    // Default to today if no due date selected
    const dueDate =
      selectedDueDate ||
      (() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today.getTime();
      })();
    const daily = isDaily;
    const priority = selectedPriority;
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const now = Date.now();

    const optimisticTodo: OptimisticTodo = {
      _id: optimisticId,
      text,
      isCompleted: false,
      createdAt: now,
      dueDate: dueDate,
      isDaily: daily,
      priority: priority,
      isOptimistic: true,
    };

    optimisticAdds = [optimisticTodo, ...optimisticAdds];
    newTodoText = "";
    showAddModal = false;
    selectedDueDate = undefined;
    isDaily = false;
    selectedPriority = undefined;

    try {
      await client.mutation(api.todos.addTodo, {
        text,
        dueDate: dueDate,
        isDaily: daily,
        priority: priority,
      });
      optimisticAdds = optimisticAdds.filter((t) => t._id !== optimisticId);
    } catch (error) {
      console.error("Failed to add todo:", error);
      optimisticAdds = optimisticAdds.filter((t) => t._id !== optimisticId);
      newTodoText = text;
    }
  }

  async function handleToggleTodo(id: Id<"todos"> | string) {
    if (typeof id === "string" && id.startsWith("optimistic-")) return;

    const realId = id as Id<"todos">;
    optimisticToggles.add(realId);
    optimisticToggles = new Set(optimisticToggles);

    try {
      await client.mutation(api.todos.toggleTodo, { id: realId });
      optimisticToggles.delete(realId);
      optimisticToggles = new Set(optimisticToggles);
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      optimisticToggles.delete(realId);
      optimisticToggles = new Set(optimisticToggles);
    }
  }

  async function handleDeleteTodo(id: Id<"todos"> | string) {
    if (typeof id === "string" && id.startsWith("optimistic-")) {
      optimisticAdds = optimisticAdds.filter((t) => t._id !== id);
      return;
    }

    const realId = id as Id<"todos">;
    optimisticDeletes.add(realId);
    optimisticDeletes = new Set(optimisticDeletes);

    try {
      await client.mutation(api.todos.deleteTodo, { id: realId });
      optimisticDeletes.delete(realId);
      optimisticDeletes = new Set(optimisticDeletes);
    } catch (error) {
      console.error("Failed to delete todo:", error);
      optimisticDeletes.delete(realId);
      optimisticDeletes = new Set(optimisticDeletes);
    }
  }

  function formatDueDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function isOverdue(dueDate?: number): boolean {
    if (!dueDate) return false;
    return dueDate < Date.now();
  }

  function getPriorityColor(priority?: string): string {
    switch (priority) {
      case "high":
        return "var(--color-error)";
      case "medium":
        return "var(--color-warning)";
      case "low":
        return "var(--color-info)";
      default:
        return "var(--color-text-tertiary)";
    }
  }

  function setDueDatePreset(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 59, 999);
    selectedDueDate = date.getTime();
  }
</script>

<div class="page">
  <!-- Minimal Header with Filters -->
  <div class="header">
    <div class="filters">
      <button
        class="filter-chip {filter === 'all' ? 'active' : ''}"
        onclick={() => (filter = "all")}
      >
        All
      </button>
      <button
        class="filter-chip {filter === 'active' ? 'active' : ''}"
        onclick={() => (filter = "active")}
      >
        Active
      </button>
      <button
        class="filter-chip {filter === 'daily' ? 'active' : ''}"
        onclick={() => (filter = "daily")}
      >
        Daily
      </button>
      <button
        class="filter-chip {filter === 'completed' ? 'active' : ''}"
        onclick={() => (filter = "completed")}
      >
        Done
      </button>
    </div>
  </div>

  <!-- Todo List -->
  <div class="todo-list">
    {#if todos.isLoading && !todos.data}
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    {:else if filteredTodos().length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          {#if filter === "completed"}
            <CheckCircle size={56} strokeWidth={1.5} />
          {:else if filter === "daily"}
            <Calendar size={56} strokeWidth={1.5} />
          {:else}
            <ListTodo size={56} strokeWidth={1.5} />
          {/if}
        </div>
        <h3 class="empty-title">
          {#if filter === "completed"}
            No completed tasks
          {:else if filter === "daily"}
            No daily tasks yet
          {:else if filter === "active"}
            All caught up!
          {:else}
            No tasks yet
          {/if}
        </h3>
        <p class="empty-subtitle">
          {#if filter === "completed"}
            Complete some tasks to see them here
          {:else if filter === "daily"}
            Add recurring tasks to build habits
          {:else if filter === "active"}
            You've completed everything. Great work!
          {:else}
            Tap the + button to add your first task
          {/if}
        </p>
      </div>
    {:else}
      {#each filteredTodos() as todo (todo._id)}
        <div
          class="todo-item {todo.isCompleted
            ? 'completed'
            : ''} {todo.isOptimistic ? 'optimistic' : ''} gesture-press"
          class:overdue={!todo.isCompleted && isOverdue(todo.dueDate)}
        >
          <Checkbox
            checked={todo.isCompleted}
            onclick={() => handleToggleTodo(todo._id)}
            disabled={todo.isOptimistic}
          />

          <div class="todo-content">
            <div class="todo-text">{todo.text}</div>
            <div class="todo-meta">
              {#if todo.priority}
                <span
                  class="priority-badge"
                  style="border-color: {getPriorityColor(
                    todo.priority,
                  )}; color: {getPriorityColor(todo.priority)};"
                >
                  {todo.priority}
                </span>
              {/if}
              {#if todo.isDaily}
                <span class="meta-tag">
                  <Repeat size={12} />
                  Daily
                </span>
              {/if}
              {#if todo.dueDate}
                <span
                  class="meta-tag"
                  class:overdue-tag={!todo.isCompleted &&
                    isOverdue(todo.dueDate)}
                >
                  <Calendar size={12} />
                  {formatDueDate(todo.dueDate)}
                </span>
              {/if}
              {#if todo.isOptimistic}
                <span class="syncing-badge">
                  <span class="syncing-dot"></span>
                  syncing
                </span>
              {/if}
            </div>
          </div>

          <button
            class="delete-btn"
            onclick={() => handleDeleteTodo(todo._id)}
            disabled={todo.isOptimistic}
            aria-label="Delete todo"
          >
            <Trash2 size={16} />
          </button>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Floating Action Button -->
  <FloatingActionButton
    onclick={() => (showAddModal = true)}
    label="Add task"
  />

  <!-- Add Task Modal -->
  <Modal
    open={showAddModal}
    onClose={() => (showAddModal = false)}
    title="New Task"
  >
    <form onsubmit={handleAddTodo} class="add-modal-form">
      <!-- Task Input with Daily Toggle -->
      <div class="form-group">
        <div class="input-with-toggle">
          <Input
            bind:value={newTodoText}
            placeholder="What needs to be done?"
            id="task-input"
            class="task-input-field"
          />
          <button
            type="button"
            role="switch"
            aria-checked={isDaily}
            aria-label="Daily task"
            class="toggle-btn-inline {isDaily ? 'active' : ''}"
            onclick={() => (isDaily = !isDaily)}
            title="Daily Task"
          >
            <Repeat size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <!-- Due Date -->
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <div class="option-buttons">
          <button
            type="button"
            class="option-chip {!selectedDueDate ||
            formatDueDate(selectedDueDate) === 'Today'
              ? 'active'
              : ''}"
            onclick={() => setDueDatePreset(0)}
          >
            <Calendar size={14} />
            Today
          </button>
          <button
            type="button"
            class="option-chip {selectedDueDate &&
            formatDueDate(selectedDueDate) === 'Tomorrow'
              ? 'active'
              : ''}"
            onclick={() => setDueDatePreset(1)}
          >
            Tomorrow
          </button>
          <input
            type="date"
            class="date-picker"
            onchange={(e) => {
              const date = new Date(e.currentTarget.value);
              date.setHours(23, 59, 59, 999);
              selectedDueDate = date.getTime();
            }}
          />
        </div>
      </div>

      <!-- Priority -->
      <div class="form-group">
        <label class="form-label">Priority</label>
        <div class="option-buttons">
          <button
            type="button"
            class="option-chip priority-high {selectedPriority === 'high'
              ? 'active'
              : ''}"
            onclick={() =>
              (selectedPriority =
                selectedPriority === "high" ? undefined : "high")}
          >
            High
          </button>
          <button
            type="button"
            class="option-chip priority-medium {selectedPriority === 'medium'
              ? 'active'
              : ''}"
            onclick={() =>
              (selectedPriority =
                selectedPriority === "medium" ? undefined : "medium")}
          >
            Medium
          </button>
          <button
            type="button"
            class="option-chip priority-low {selectedPriority === 'low'
              ? 'active'
              : ''}"
            onclick={() =>
              (selectedPriority =
                selectedPriority === "low" ? undefined : "low")}
          >
            Low
          </button>
        </div>
      </div>

      <div class="modal-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={!newTodoText.trim()}
          class="submit-btn-full"
        >
          Add Task
        </Button>
      </div>
    </form>
  </Modal>
</div>

<style>
  .page {
    background: var(--color-bg-primary);
    padding: 16px;
    padding-bottom: 100px;
  }

  /* Header */
  .header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .page-title {
    font-size: 32px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 16px 0;
    letter-spacing: -0.02em;
  }

  .filters {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .filters::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .filter-chip.active {
    background: var(--color-accent);
    color: #000000;
    border-color: var(--color-accent);
    box-shadow:
      0 0 20px rgba(167, 139, 250, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .filter-chip:active {
    transform: scale(0.95);
  }

  /* Modal Form */
  .add-modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-with-toggle {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  :global(.task-input-field) {
    flex: 1;
  }

  .toggle-btn-inline {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn-inline.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #000000;
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.4);
  }

  .toggle-btn-inline:active {
    transform: scale(0.95);
  }

  .form-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .option-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .option-chip {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .option-chip.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #000000;
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.4);
  }

  .option-chip.priority-high {
    border-color: rgba(248, 113, 113, 0.3);
  }

  .option-chip.priority-high.active {
    background: var(--color-error);
    border-color: var(--color-error);
    box-shadow: 0 0 16px rgba(248, 113, 113, 0.4);
  }

  .option-chip.priority-medium {
    border-color: rgba(251, 191, 36, 0.3);
  }

  .option-chip.priority-medium.active {
    background: var(--color-warning);
    border-color: var(--color-warning);
    box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
  }

  .option-chip.priority-low {
    border-color: rgba(96, 165, 250, 0.3);
  }

  .option-chip.priority-low.active {
    background: var(--color-info);
    border-color: var(--color-info);
    box-shadow: 0 0 16px rgba(96, 165, 250, 0.4);
  }

  .option-chip:active {
    transform: scale(0.95);
  }

  .date-picker {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    color: var(--color-text-primary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all 0.2s ease;
    color-scheme: dark;
  }

  .date-picker::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }

  .date-picker:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.3);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 4px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  :global(.submit-btn-full) {
    flex: 1;
  }

  .todo-list {
    padding: 8px 20px 24px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    transition: all var(--transition-fast);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .todo-item.optimistic {
    opacity: 0.6;
  }

  .todo-item.overdue {
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(248, 113, 113, 0.05);
    box-shadow:
      0 0 16px rgba(248, 113, 113, 0.2),
      0 4px 12px rgba(0, 0, 0, 0.6);
  }

  .todo-content {
    flex: 1;
    min-width: 0;
  }

  .todo-text {
    font-size: 15px;
    color: var(--color-text-primary);
    line-height: 1.4;
    word-wrap: break-word;
    transition: all var(--transition-fast);
  }

  .todo-item.completed .todo-text {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
  }

  .todo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .priority-badge,
  .meta-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .priority-badge {
    border: 1px solid;
  }

  .meta-tag {
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-subtle);
  }

  .meta-tag.overdue-tag {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-error);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .syncing-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    font-size: 11px;
    color: var(--color-text-tertiary);
    background: var(--color-surface-2);
    border-radius: var(--radius-full);
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
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .delete-btn:active {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    transform: scale(0.9);
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--color-text-tertiary);
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  .empty-subtitle {
    font-size: 14px;
    color: var(--color-text-tertiary);
    line-height: 1.5;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-down {
    animation: slideDown 0.2s ease-out;
  }
</style>
