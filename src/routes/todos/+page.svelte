<script lang="ts">
  import {
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Circle,
    ListTodo,
    Minus,
    Plus,
    Repeat,
    Trash2,
  } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import {
    Button,
    Card,
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

  
  // Subtask state
  let addingSubtaskTo = $state<Id<"todos"> | null>(null);
  let expandedTodos = $state<Set<string>>(new Set());

  // Long press state
  let pressTimer: number | null = null;

  const client = useConvexClient();
  const todos = useQuery(api.todos.getTodos, { includeCompleted: true });

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
    parentId?: Id<"todos">;
    level?: number;
    subtasks?: OptimisticTodo[];
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

  const sortedTodos = $derived(() => {
    const todoList = mergedTodos();
    
    // Separate active and completed
    const active = todoList.filter(t => !t.isCompleted);
    const completed = todoList.filter(t => t.isCompleted);
    
    // Sort active todos
    const sorted = active.sort((a, b) => {
      // 1. Daily tasks first
      if (a.isDaily && !b.isDaily) return -1;
      if (!a.isDaily && b.isDaily) return 1;
      
      // 2. Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      // 3. Then by creation date (newest first)
      return b.createdAt - a.createdAt;
    });
    
    // Return active tasks followed by completed tasks
    return [...sorted, ...completed];
  });



  const activeCount = $derived(() => {
    return mergedTodos().filter((todo) => !todo.isCompleted).length;
  });

  const completedTodosCount = $derived(() => {
    return mergedTodos().filter((todo) => todo.isCompleted).length;
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
    const dueDate = selectedDueDate || (() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today.getTime();
    })();
    const daily = isDaily;
    const priority = selectedPriority;
    const parentId = addingSubtaskTo;

    // Close modal and reset form
    showAddModal = false;
    newTodoText = "";
    selectedDueDate = undefined;
    isDaily = false;
    selectedPriority = undefined;
    addingSubtaskTo = null;

    try {
      const mutationArgs: any = {
        text,
        dueDate: dueDate,
        isDaily: daily,
        priority: priority,
      };
      
      // Only include parentId if it's not null
      if (parentId) {
        mutationArgs.parentId = parentId;
      }
      
      await client.mutation(api.todos.addTodo, mutationArgs);
    } catch (error) {
      console.error("Failed to add todo:", error);
      // Restore form values on error
      newTodoText = text;
      selectedDueDate = dueDate;
      isDaily = daily;
      selectedPriority = priority;
      addingSubtaskTo = parentId;
      showAddModal = true;
    }
  }

  async function handleToggleTodo(id: Id<"todos"> | string, subtaskIds: Id<"todos">[] = []) {
    if (typeof id === "string" && id.startsWith("optimistic-")) return;

    const realId = id as Id<"todos">;
    
    // Add optimistic toggle for the main todo
    if (optimisticToggles.has(realId)) {
      optimisticToggles.delete(realId);
    } else {
      optimisticToggles.add(realId);
    }
    
    // If this is a parent task with subtasks, toggle all subtasks optimistically
    if (subtaskIds.length > 0) {
      // Get the new state of the parent (after toggle)
      const todo = mergedTodos().find(t => t._id === realId);
      if (todo) {
        const newParentState = !todo.isCompleted;
        
        // Toggle all subtasks to match parent
        for (const subtaskId of subtaskIds) {
          const subtask = mergedTodos().find(t => t._id === subtaskId);
          if (subtask) {
            // If subtask state doesn't match new parent state, toggle it
            if (subtask.isCompleted !== newParentState) {
              if (optimisticToggles.has(subtaskId)) {
                optimisticToggles.delete(subtaskId);
              } else {
                optimisticToggles.add(subtaskId);
              }
            }
          }
        }
      }
    }
    
    optimisticToggles = new Set(optimisticToggles);

    try {
      // Toggle the main todo
      await client.mutation(api.todos.toggleTodo, { id: realId });
      
      // If this is a parent task with subtasks, toggle all subtasks to match parent state
      if (subtaskIds.length > 0) {
        // Get the server data to know which subtasks to toggle
        const serverTodos = todos.data || [];
        const parent = serverTodos.find(t => t._id === realId);
        
        if (parent) {
          const newParentState = parent.isCompleted;
          
          // Toggle subtasks that don't match the new parent state
          for (const subtaskId of subtaskIds) {
            const subtask = serverTodos.find(t => t._id === subtaskId);
            if (subtask && subtask.isCompleted !== newParentState) {
              await client.mutation(api.todos.toggleTodo, { id: subtaskId });
            }
          }
        }
      }
      
      // Clear optimistic toggles after successful mutation
      optimisticToggles.delete(realId);
      for (const subtaskId of subtaskIds) {
        optimisticToggles.delete(subtaskId);
      }
      optimisticToggles = new Set(optimisticToggles);
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      // Revert optimistic toggles on error
      optimisticToggles.delete(realId);
      for (const subtaskId of subtaskIds) {
        optimisticToggles.delete(subtaskId);
      }
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

  function toggleExpanded(todoId: string) {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    expandedTodos = newExpanded;
  }

  function openAddSubtask(parentId: Id<"todos">) {
    addingSubtaskTo = parentId;
    showAddModal = true;
  }

  // Fetch subtasks for a todo
  function getSubtasksQuery(parentId: Id<"todos">) {
    return useQuery(api.todos.getSubtasks, { parentId });
  }
</script>

<div class="page">
  <div class="content">
    <!-- Todos Grid -->
    <div class="todos-grid">
    {#if todos.isLoading && !todos.data}
      <div class="loading-state">
        <div class="loading-pulse"></div>
      </div>
    {:else if sortedTodos().length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <ListTodo size={56} strokeWidth={1.5} />
        </div>
        <h3 class="empty-title">No tasks yet</h3>
        <p class="empty-subtitle">Tap the + button to add your first task</p>
      </div>
    {:else}
      {#each sortedTodos() as todo (todo._id)}
        {@const subtasksQuery = typeof todo._id === 'string' && !todo._id.startsWith('optimistic') ? getSubtasksQuery(todo._id as Id<"todos">) : null}
        {@const subtasks = subtasksQuery?.data || []}
        {@const completedSubtasks = subtasks.filter(s => s.isCompleted).length}
        {@const totalSubtasks = subtasks.length}
        {@const hasPartialCompletion = totalSubtasks > 0 && completedSubtasks > 0 && completedSubtasks < totalSubtasks}
        {@const hasFullCompletion = totalSubtasks > 0 && completedSubtasks === totalSubtasks}
        
        <Card 
          variant="elevated"
          class="todo-card {todo.isCompleted ? 'completed' : ''} {todo.priority ? 'priority-' + todo.priority : ''} {!todo.isCompleted && isOverdue(todo.dueDate) ? 'overdue' : ''}"
        >
          <div class="todo-row"
            ontouchstart={() => handleLongPressStart(todo)}
            ontouchend={handleLongPressEnd}
            ontouchcancel={handleLongPressEnd}
            onmousedown={() => handleLongPressStart(todo)}
            onmouseup={handleLongPressEnd}
            onmouseleave={handleLongPressEnd}
          >
            <Checkbox
              checked={todo.isCompleted || hasFullCompletion}
              partial={hasPartialCompletion && !todo.isCompleted}
              onclick={() => handleToggleTodo(todo._id, subtasks.map(s => s._id as Id<"todos">))}
              disabled={todo.isOptimistic}
            />
            
            <div class="todo-content">
              <div class="todo-text">{todo.text}</div>
              {#if todo.priority || todo.isDaily || todo.dueDate || totalSubtasks > 0}
                <div class="todo-tags">
                  {#if todo.priority}
                    <span class="tag priority-{todo.priority}">{todo.priority}</span>
                  {/if}
                  {#if todo.isDaily}
                    <span class="tag daily"><Repeat size={10} strokeWidth={2.5} /> Daily</span>
                  {/if}
                  {#if todo.dueDate}
                    <span class="tag date {!todo.isCompleted && isOverdue(todo.dueDate) ? 'overdue' : ''}">
                      <Calendar size={10} strokeWidth={2.5} /> {formatDueDate(todo.dueDate)}
                    </span>
                  {/if}
                  {#if totalSubtasks > 0}
                    <span class="tag progress">{completedSubtasks}/{totalSubtasks}</span>
                  {/if}
                </div>
              {/if}
            </div>

            <div class="todo-actions">
              {#if typeof todo._id === 'string' && !todo._id.startsWith('optimistic')}
                {@const subtasksQuery = getSubtasksQuery(todo._id as Id<"todos">)}
                {@const subtasks = subtasksQuery.data || []}
                {#if subtasks.length > 0}
                  <button
                    class="action-btn"
                    onclick={(e) => { e.stopPropagation(); toggleExpanded(todo._id as string); }}
                  >
                    {#if expandedTodos.has(todo._id as string)}
                      <ChevronDown size={16} strokeWidth={2.5} />
                    {:else}
                      <ChevronRight size={16} strokeWidth={2.5} />
                    {/if}
                  </button>
                {/if}
                {#if (todo.level || 0) < 2}
                  <button
                    class="action-btn"
                    onclick={(e) => { e.stopPropagation(); openAddSubtask(todo._id as Id<"todos">); }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                {/if}
              {/if}
              <button
                class="action-btn delete"
                onclick={(e) => { e.stopPropagation(); confirmDelete(todo._id); }}
                disabled={todo.isOptimistic}
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {#if typeof todo._id === 'string' && !todo._id.startsWith('optimistic') && expandedTodos.has(todo._id)}
            {@const subtasksQuery = getSubtasksQuery(todo._id as Id<"todos">)}
            {@const subtasks = subtasksQuery.data || []}
            {#if subtasks.length > 0}
              <div class="subtasks">
                {#each subtasks as subtask (subtask._id)}
                  <div class="subtask-row">
                    <Checkbox
                      checked={subtask.isCompleted}
                      onclick={() => handleToggleTodo(subtask._id, [])}
                    />
                    <span class="subtask-text">{subtask.text}</span>
                    <button
                      class="action-btn delete"
                      onclick={() => confirmDelete(subtask._id)}
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </Card>
      {/each}
    {/if}
    </div>
  </div>

  <!-- Floating Action Button -->
  <FloatingActionButton
    onclick={() => (showAddModal = true)}
    label="Add task"
  />

  <!-- Add Task Modal -->
  <Modal
    open={showAddModal}
    onClose={() => { showAddModal = false; addingSubtaskTo = null; }}
    title={addingSubtaskTo ? "New Subtask" : "New Task"}
  >
    <form onsubmit={handleAddTodo} class="add-modal-form">
      {#if addingSubtaskTo}
        <div class="subtask-notice">
          <span class="notice-icon">↳</span>
          <span class="notice-text">Adding subtask</span>
        </div>
      {/if}

      <!-- Task Input with Daily Toggle -->
      <div class="form-group">
        <div class="input-with-toggle">
          <Input
            bind:value={newTodoText}
            placeholder={addingSubtaskTo ? "Subtask description..." : "What needs to be done?"}
            id="task-input"
            class="task-input-field"
          />
          {#if !addingSubtaskTo}
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
          {/if}
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
    position: relative;
    height: 100%;
    overflow: hidden;
  }

  .content {
    padding: 16px;
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, auto);
    gap: 16px;
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }



  /* Todos Grid */
  .todos-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Todo Card Styling */
  :global(.todo-card) {
    position: relative;
    padding: 12px !important;
  }

  :global(.todo-card.completed) {
    opacity: 0.5;
  }

  :global(.todo-card.priority-high) {
    border-left: 3px solid var(--color-error) !important;
  }

  :global(.todo-card.priority-medium) {
    border-left: 3px solid var(--color-warning) !important;
  }

  :global(.todo-card.priority-low) {
    border-left: 3px solid var(--color-info) !important;
  }

  :global(.todo-card.overdue) {
    border-left: 3px solid var(--color-error) !important;
    background: linear-gradient(135deg, rgba(248, 113, 113, 0.05), rgba(255, 255, 255, 0.02)) !important;
  }

  .todo-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .todo-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .todo-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.3;
    word-break: break-word;
  }

  :global(.todo-card.completed) .todo-text {
    text-decoration: line-through;
    color: var(--color-text-muted);
  }

  .todo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 4px;
    white-space: nowrap;
  }

  .tag.priority-high {
    background: rgba(248, 113, 113, 0.12);
    color: var(--color-error);
    border: 1px solid rgba(248, 113, 113, 0.3);
  }

  .tag.priority-medium {
    background: rgba(251, 191, 36, 0.12);
    color: var(--color-warning);
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .tag.priority-low {
    background: rgba(96, 165, 250, 0.12);
    color: var(--color-info);
    border: 1px solid rgba(96, 165, 250, 0.3);
  }

  .tag.daily {
    background: rgba(167, 139, 250, 0.12);
    color: var(--color-accent-light);
    border: 1px solid rgba(167, 139, 250, 0.3);
  }

  .tag.date {
    background: rgba(96, 165, 250, 0.08);
    color: var(--color-info);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .tag.date.overdue {
    background: rgba(248, 113, 113, 0.15);
    color: var(--color-error);
    border: 1px solid rgba(248, 113, 113, 0.4);
  }

  .tag.progress {
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-text-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .todo-actions {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .action-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:active {
    transform: scale(0.92);
  }

  .action-btn.delete:active {
    background: rgba(248, 113, 113, 0.15);
    border-color: rgba(248, 113, 113, 0.3);
    color: var(--color-error);
  }

  /* Subtasks */
  .subtasks {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }

  .subtask-text {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }



  /* Loading State */
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  .loading-pulse {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(167, 139, 250, 0.3),
      rgba(167, 139, 250, 0.1)
    );
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    color: var(--color-text-tertiary);
    margin-bottom: 20px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .empty-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }

  .empty-subtitle {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-tertiary);
    line-height: 1.5;
    max-width: 280px;
  }

  /* Modal Form */
  .add-modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .subtask-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(167, 139, 250, 0.08);
    border: 1px solid rgba(167, 139, 250, 0.2);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-accent-light);
  }

  .notice-icon {
    font-size: 16px;
    opacity: 0.7;
  }

  .notice-text {
    flex: 1;
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
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.02em;
  }

  .option-chip.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #000000;
    box-shadow: 0 0 20px rgba(167, 139, 250, 0.4);
  }

  .option-chip.priority-high {
    border-color: rgba(248, 113, 113, 0.3);
  }

  .option-chip.priority-high.active {
    background: var(--color-error);
    border-color: var(--color-error);
    box-shadow: 0 0 20px rgba(248, 113, 113, 0.4);
  }

  .option-chip.priority-medium {
    border-color: rgba(251, 191, 36, 0.3);
  }

  .option-chip.priority-medium.active {
    background: var(--color-warning);
    border-color: var(--color-warning);
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
  }

  .option-chip.priority-low {
    border-color: rgba(96, 165, 250, 0.3);
  }

  .option-chip.priority-low.active {
    background: var(--color-info);
    border-color: var(--color-info);
    box-shadow: 0 0 20px rgba(96, 165, 250, 0.4);
  }

  .option-chip:active {
    transform: scale(0.96);
  }

  .date-picker {
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.02em;
  }

  .date-picker:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.3);
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  :global(.submit-btn-full) {
    flex: 1;
  }

  /* Confirm Modal */
  .confirm-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .confirm-content p {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
  }

  .confirm-actions :global(button) {
    flex: 1;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  .option-chip:active {
    transform: scale(0.96);
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
      0 2px 8px rgba(0, 0, 0, 0.4),
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

  .check-box.partial {
    background: rgba(167, 139, 250, 0.2);
    border-color: var(--color-accent);
    color: var(--color-accent);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.2);
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
    line-height: 1.6;
    word-wrap: break-word;
    transition: all 0.3s ease;
    letter-spacing: -0.01em;
  }

  .todo-wrapper.completed .todo-text {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
    opacity: 0.5;
    transform: scale(0.98);
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

  .tag-progress {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--color-text-tertiary);
    font-weight: 700;
  }

  .tag-progress-partial {
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.3);
    color: var(--color-warning);
  }

  .tag-progress-complete {
    background: rgba(52, 211, 153, 0.1);
    border-color: rgba(52, 211, 153, 0.3);
    color: var(--color-success);
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

  /* Subtask Notice in Modal */
  .subtask-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.3);
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .notice-icon {
    font-size: 16px;
    color: var(--color-accent);
  }

  .notice-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent-light);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Subtasks */
  .todo-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .expand-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .expand-btn:active {
    transform: scale(0.95);
  }

  .subtask-count {
    font-size: 11px;
    font-weight: 600;
  }

  .add-subtask-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-subtask-btn:active {
    transform: scale(0.9);
  }

  .subtasks-container {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .subtask-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .subtask-item:active {
    transform: scale(0.99);
  }

  .subtask-item .check-box {
    width: 18px;
    height: 18px;
    border-width: 1.5px;
  }

  .subtask-text {
    flex: 1;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .subtask-item .todo-delete {
    width: 28px;
    height: 28px;
  }
</style>
