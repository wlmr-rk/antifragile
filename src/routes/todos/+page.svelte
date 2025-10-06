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
  let showEditModal = $state(false);
  let showDeleteConfirm = $state(false);
  let editingTodo = $state<OptimisticTodo | null>(null);
  let deletingTodoId = $state<Id<"todos"> | null>(null);
  let selectedDueDate = $state<number | undefined>(undefined);
  let isDaily = $state(false);
  let selectedPriority = $state<"low" | "medium" | "high" | undefined>(
    undefined,
  );
  let filter: "all" | "active" | "completed" | "daily" = $state("all");

  // Long press state
  let pressTimer: number | null = null;

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

  function confirmDelete(id: Id<"todos"> | string) {
    deletingTodoId = id as Id<"todos">;
    showDeleteConfirm = true;
  }

  async function handleDeleteTodo() {
    if (!deletingTodoId) return;

    const id = deletingTodoId;
    showDeleteConfirm = false;
    deletingTodoId = null;

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

  function handleLongPressStart(todo: OptimisticTodo) {
    pressTimer = window.setTimeout(() => {
      openEditModal(todo);
    }, 500); // 500ms long press
  }

  function handleLongPressEnd() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function openEditModal(todo: OptimisticTodo) {
    editingTodo = todo;
    newTodoText = todo.text;
    selectedDueDate = todo.dueDate;
    isDaily = todo.isDaily;
    selectedPriority = todo.priority;
    showEditModal = true;
  }

  async function handleEditTodo(e: Event) {
    e.preventDefault();
    if (!editingTodo || typeof editingTodo._id === "string") return;

    const trimmedText = newTodoText.trim();
    if (!trimmedText) return;

    showEditModal = false;

    try {
      await client.mutation(api.todos.updateTodo, {
        id: editingTodo._id as Id<"todos">,
        text: trimmedText,
        dueDate: selectedDueDate,
        isDaily,
        priority: selectedPriority,
      });
    } catch (error) {
      console.error("Failed to update todo:", error);
    }

    // Reset form
    newTodoText = "";
    selectedDueDate = undefined;
    isDaily = false;
    selectedPriority = undefined;
    editingTodo = null;
  }

  function closeEditModal() {
    showEditModal = false;
    newTodoText = "";
    selectedDueDate = undefined;
    isDaily = false;
    selectedPriority = undefined;
    editingTodo = null;
  }
</script>

<div class="page">
  <!-- Floating Filter Pills -->
  <div class="filter-bar">
    <button
      class="filter-pill {filter === 'all' ? 'active' : ''}"
      onclick={() => (filter = "all")}
    >
      <span class="filter-count">{mergedTodos().length}</span>
      All
    </button>
    <button
      class="filter-pill {filter === 'active' ? 'active' : ''}"
      onclick={() => (filter = "active")}
    >
      <span class="filter-count">{activeCount()}</span>
      Active
    </button>
    <button
      class="filter-pill {filter === 'daily' ? 'active' : ''}"
      onclick={() => (filter = "daily")}
    >
      <Repeat size={14} strokeWidth={2.5} />
      Daily
    </button>
    <button
      class="filter-pill {filter === 'completed' ? 'active' : ''}"
      onclick={() => (filter = "completed")}
    >
      <CheckCircle size={14} strokeWidth={2.5} />
      Done
    </button>
  </div>

  <!-- Todo List -->
  <div class="todo-list">
    {#if todos.isLoading && !todos.data}
      <div class="skeleton-list">
        <div class="skeleton-todo"></div>
        <div class="skeleton-todo"></div>
        <div class="skeleton-todo"></div>
        <div class="skeleton-todo"></div>
        <div class="skeleton-todo"></div>
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
          class="todo-wrapper {todo.isCompleted ? 'completed' : ''}"
          class:overdue={!todo.isCompleted && isOverdue(todo.dueDate)}
          class:optimistic={todo.isOptimistic}
        >
          <div
            class="todo-item"
            ontouchstart={() => handleLongPressStart(todo)}
            ontouchend={handleLongPressEnd}
            ontouchcancel={handleLongPressEnd}
            onmousedown={() => handleLongPressStart(todo)}
            onmouseup={handleLongPressEnd}
            onmouseleave={handleLongPressEnd}
          >
            <button
              class="todo-check"
              onclick={() => handleToggleTodo(todo._id)}
              disabled={todo.isOptimistic}
              aria-label={todo.isCompleted
                ? "Mark incomplete"
                : "Mark complete"}
            >
              <div class="check-box {todo.isCompleted ? 'checked' : ''}">
                {#if todo.isCompleted}
                  <CheckCircle size={20} strokeWidth={2.5} />
                {/if}
              </div>
            </button>

            <div class="todo-main">
              <div class="todo-text">{todo.text}</div>
              {#if todo.priority || todo.isDaily || todo.dueDate || todo.isOptimistic}
                <div class="todo-tags">
                  {#if todo.priority}
                    <span
                      class="tag tag-priority"
                      style="--tag-color: {getPriorityColor(todo.priority)};"
                    >
                      {todo.priority}
                    </span>
                  {/if}
                  {#if todo.isDaily}
                    <span class="tag tag-daily">
                      <Repeat size={11} strokeWidth={2.5} />
                      Daily
                    </span>
                  {/if}
                  {#if todo.dueDate}
                    <span
                      class="tag tag-date"
                      class:tag-overdue={!todo.isCompleted &&
                        isOverdue(todo.dueDate)}
                    >
                      <Calendar size={11} strokeWidth={2.5} />
                      {formatDueDate(todo.dueDate)}
                    </span>
                  {/if}
                  {#if todo.isOptimistic}
                    <span class="tag tag-syncing">
                      <span class="sync-pulse"></span>
                      syncing
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            <button
              class="todo-delete"
              onclick={() => confirmDelete(todo._id)}
              disabled={todo.isOptimistic}
              aria-label="Delete task"
            >
              <Trash2 size={18} strokeWidth={2.5} />
            </button>
          </div>
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

  <!-- Edit Task Modal -->
  <Modal open={showEditModal} onClose={closeEditModal} title="Edit Task">
    <form onsubmit={handleEditTodo} class="add-modal-form">
      <div class="form-group">
        <div class="input-with-toggle">
          <Input
            bind:value={newTodoText}
            placeholder="What needs to be done?"
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
          Save Changes
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Delete Confirmation Modal -->
  <Modal
    open={showDeleteConfirm}
    onClose={() => {
      showDeleteConfirm = false;
      deletingTodoId = null;
    }}
    title="Delete Task"
  >
    <div class="confirm-content">
      <p>
        Are you sure you want to delete this task? This action cannot be undone.
      </p>
      <div class="confirm-actions">
        <Button
          variant="secondary"
          onclick={() => {
            showDeleteConfirm = false;
            deletingTodoId = null;
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onclick={handleDeleteTodo}
          style="background: var(--color-error); border-color: var(--color-error);"
        >
          Delete
        </Button>
      </div>
    </div>
  </Modal>
</div>

<style>
  .page {
    background: var(--color-bg-primary);
    padding: 16px;
    padding-bottom: 100px;
  }

  /* Filter Bar */
  .filter-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .filter-bar::-webkit-scrollbar {
    display: none;
  }

  .filter-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  .filter-count {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 10px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    color: var(--color-text-secondary);
  }

  .filter-pill.active {
    background: rgba(167, 139, 250, 0.1);
    color: var(--color-accent-light);
    border-color: rgba(167, 139, 250, 0.3);
  }

  .filter-pill.active .filter-count {
    background: var(--color-accent);
    color: #000000;
  }

  .filter-pill:active {
    transform: scale(0.97);
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
    padding: 0;
  }

  /* Todo Items */
  .todo-wrapper {
    margin-bottom: 8px;
    transition: all 0.2s ease;
  }

  .todo-wrapper.optimistic {
    opacity: 0.5;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    transition: all 0.2s ease;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.02);
  }

  .todo-wrapper.overdue .todo-item {
    border-color: rgba(248, 113, 113, 0.25);
    background: rgba(248, 113, 113, 0.03);
  }

  .todo-item:active {
    transform: scale(0.99);
  }

  /* Checkbox */
  .todo-check {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .todo-check:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .check-box {
    width: 22px;
    height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: transparent;
    background: rgba(255, 255, 255, 0.02);
  }

  .check-box.checked {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #000000;
    box-shadow: 0 0 12px rgba(167, 139, 250, 0.3);
  }

  .todo-check:active .check-box {
    transform: scale(0.92);
  }

  /* Content */
  .todo-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .todo-text {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text-primary);
    line-height: 1.5;
    word-wrap: break-word;
    transition: all 0.2s ease;
  }

  .todo-wrapper.completed .todo-text {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* Tags */
  .todo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--color-text-tertiary);
  }

  .tag-priority {
    background: rgba(255, 255, 255, 0.02);
    border-color: var(--tag-color);
    color: var(--tag-color);
  }

  .tag-daily {
    background: rgba(34, 211, 238, 0.08);
    border-color: rgba(34, 211, 238, 0.2);
    color: var(--color-cyan);
  }

  .tag-date {
    background: rgba(96, 165, 250, 0.08);
    border-color: rgba(96, 165, 250, 0.2);
    color: var(--color-info);
  }

  .tag-overdue {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.3);
    color: var(--color-error);
  }

  .tag-syncing {
    background: rgba(167, 139, 250, 0.08);
    border-color: rgba(167, 139, 250, 0.2);
    color: var(--color-accent-light);
  }

  .sync-pulse {
    width: 5px;
    height: 5px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.8);
    }
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

  /* Delete Button */
  .todo-delete {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .todo-delete:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .todo-delete:active:not(:disabled) {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.3);
    color: var(--color-error);
    transform: scale(0.92);
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px;
    margin-top: 20px;
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--color-text-tertiary);
    opacity: 0.5;
  }

  .empty-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }

  .empty-subtitle {
    font-size: 14px;
    color: var(--color-text-tertiary);
    line-height: 1.6;
    max-width: 280px;
    margin: 0 auto;
  }

  /* Skeleton Loaders */
  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-todo {
    height: 72px;
    border-radius: 14px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-todo:nth-child(2) {
    animation-delay: 0.1s;
  }

  .skeleton-todo:nth-child(3) {
    animation-delay: 0.2s;
  }

  .skeleton-todo:nth-child(4) {
    animation-delay: 0.3s;
  }

  .skeleton-todo:nth-child(5) {
    animation-delay: 0.4s;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
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

  /* Confirmation Modal */
  .confirm-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .confirm-content p {
    font-size: 15px;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
  }

  .confirm-actions button {
    flex: 1;
  }
</style>
