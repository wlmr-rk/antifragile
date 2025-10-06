<script lang="ts">
  import { Calendar, ChevronDown, Plus, Repeat } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";

  let newTodoText = $state("");
  let showAddOptions = $state(false);
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
    const dueDate = selectedDueDate;
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
    showAddOptions = false;
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
  <!-- Filters -->
  <div class="filters">
    <button
      class="filter-btn {filter === 'all' ? 'active' : ''}"
      onclick={() => (filter = "all")}
    >
      All
    </button>
    <button
      class="filter-btn {filter === 'active' ? 'active' : ''}"
      onclick={() => (filter = "active")}
    >
      Active
    </button>
    <button
      class="filter-btn {filter === 'daily' ? 'active' : ''}"
      onclick={() => (filter = "daily")}
    >
      Daily
    </button>
    <button
      class="filter-btn {filter === 'completed' ? 'active' : ''}"
      onclick={() => (filter = "completed")}
    >
      Done
    </button>
  </div>

  <!-- Add Todo Section -->
  <div class="add-section">
    <form onsubmit={handleAddTodo} class="add-form">
      <input
        type="text"
        bind:value={newTodoText}
        placeholder="Add a task..."
        class="add-input"
        autocomplete="off"
      />
      <button
        type="button"
        class="options-btn"
        aria-label="Show add task options"
        onclick={() => (showAddOptions = !showAddOptions)}
      >
        <ChevronDown
          size={20}
          style="transform: rotate({showAddOptions
            ? '180deg'
            : '0'}); transition: transform 0.2s;"
        />
      </button>
      <button
        type="submit"
        class="add-btn"
        aria-label="Add task"
        disabled={!newTodoText.trim()}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </form>

    {#if showAddOptions}
      <div class="options-panel animate-slide-down">
        <!-- Due Date -->
        <div class="option-group">
          <label class="option-label" id="due-date-label">Due Date</label>
          <div
            class="option-buttons"
            role="group"
            aria-labelledby="due-date-label"
          >
            <button
              type="button"
              class="option-chip {selectedDueDate &&
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
            <button
              type="button"
              class="option-chip {selectedDueDate &&
              formatDueDate(selectedDueDate).includes('7')
                ? 'active'
                : ''}"
              onclick={() => setDueDatePreset(7)}
            >
              Next Week
            </button>
            {#if selectedDueDate}
              <button
                type="button"
                class="option-chip"
                onclick={() => (selectedDueDate = undefined)}
              >
                Clear
              </button>
            {/if}
          </div>
        </div>

        <!-- Daily Toggle -->
        <div class="option-group">
          <label class="option-label" for="daily-toggle">
            <Repeat size={14} />
            Daily Task
          </label>
          <button
            type="button"
            id="daily-toggle"
            role="switch"
            aria-checked={isDaily}
            class="toggle-btn {isDaily ? 'active' : ''}"
            onclick={() => (isDaily = !isDaily)}
          >
            <div class="toggle-track">
              <div class="toggle-thumb"></div>
            </div>
          </button>
        </div>

        <!-- Priority -->
        <div class="option-group">
          <label class="option-label" id="priority-label">Priority</label>
          <div
            class="option-buttons"
            role="group"
            aria-labelledby="priority-label"
          >
            <button
              type="button"
              class="option-chip {selectedPriority === 'high' ? 'active' : ''}"
              onclick={() =>
                (selectedPriority =
                  selectedPriority === "high" ? undefined : "high")}
              style="border-color: var(--color-error);"
            >
              High
            </button>
            <button
              type="button"
              class="option-chip {selectedPriority === 'medium'
                ? 'active'
                : ''}"
              onclick={() =>
                (selectedPriority =
                  selectedPriority === "medium" ? undefined : "medium")}
              style="border-color: var(--color-warning);"
            >
              Medium
            </button>
            <button
              type="button"
              class="option-chip {selectedPriority === 'low' ? 'active' : ''}"
              onclick={() =>
                (selectedPriority =
                  selectedPriority === "low" ? undefined : "low")}
              style="border-color: var(--color-info);"
            >
              Low
            </button>
          </div>
        </div>
      </div>
    {/if}
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
            ✨
          {:else if filter === "daily"}
            📅
          {:else}
            📝
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
          <button
            class="todo-checkbox"
            onclick={() => handleToggleTodo(todo._id)}
            disabled={todo.isOptimistic}
            aria-label="Toggle todo"
          >
            <div class="checkbox-inner">
              {#if todo.isCompleted}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 7L5.5 10.5L12 3.5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              {/if}
            </div>
          </button>

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
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--color-bg-primary);
  }

  .filters {
    display: flex;
    gap: 8px;
    padding: 16px 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .filters::-webkit-scrollbar {
    display: none;
  }

  .filter-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .filter-btn.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  .filter-btn:active {
    transform: scale(0.95);
  }

  .add-section {
    padding: 0 20px 16px;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .add-form {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .add-input {
    flex: 1;
    padding: 12px 16px;
    font-size: 15px;
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    outline: none;
    transition: all var(--transition-fast);
  }

  .add-input:focus {
    border-color: var(--color-accent);
    background: var(--color-surface-2);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  .add-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .options-btn,
  .add-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-medium);
    background: var(--color-surface-1);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .add-btn {
    background: var(--color-accent);

    border-color: var(--color-accent);
    color: white;
  }

  .add-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .add-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .options-panel {
    margin-top: 16px;
    padding: 16px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
  }

  .option-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .option-group:last-child {
    margin-bottom: 0;
  }

  .option-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .option-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .option-chip {
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .option-chip.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .toggle-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }

  .toggle-track {
    width: 48px;
    height: 28px;
    background: var(--color-surface-2);
    border: 2px solid var(--color-border-medium);
    border-radius: var(--radius-full);
    position: relative;
    transition: all var(--transition-fast);
  }

  .toggle-btn.active .toggle-track {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .toggle-thumb {
    width: 20px;
    height: 20px;
    background: var(--color-text-primary);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform var(--transition-fast);
  }

  .toggle-btn.active .toggle-thumb {
    transform: translateX(20px);
  }

  .todo-list {
    padding: 8px 20px 24px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    margin-bottom: 8px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .todo-item.optimistic {
    opacity: 0.7;
  }

  .todo-item.overdue {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
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
  }

  .todo-item.completed .checkbox-inner {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
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
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.3;
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
