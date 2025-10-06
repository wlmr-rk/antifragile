<script lang="ts">
  import { Grid3x3, Plus, Trash2 } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";

  type Quadrant =
    | "urgent-important"
    | "not-urgent-important"
    | "urgent-not-important"
    | "not-urgent-not-important";

  const client = useConvexClient();
  const matrixSummary = useQuery(api.eisenhower.getMatrixSummary, {});
  const tasksMatrix = useQuery(api.eisenhower.getTasksMatrix, {
    includeCompleted: false,
  });

  let showAddTask = $state(false);
  let selectedQuadrant = $state<Quadrant>("urgent-important");
  let newTaskText = $state("");
  let newTaskNotes = $state("");

  // Optimistic state
  let optimisticToggles = $state<Set<Id<"eisenhower">>>(new Set());
  let optimisticDeletes = $state<Set<Id<"eisenhower">>>(new Set());

  const quadrants = [
    {
      id: "urgent-important" as Quadrant,
      title: "Do First",
      subtitle: "Urgent + Important",
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.08)",
      borderColor: "rgba(239, 68, 68, 0.3)",
      icon: "🔥",
    },
    {
      id: "not-urgent-important" as Quadrant,
      title: "Schedule",
      subtitle: "Important",
      color: "#3b82f6",
      bgColor: "rgba(59, 130, 246, 0.08)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      icon: "📅",
    },
    {
      id: "urgent-not-important" as Quadrant,
      title: "Delegate",
      subtitle: "Urgent",
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.08)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      icon: "👥",
    },
    {
      id: "not-urgent-not-important" as Quadrant,
      title: "Eliminate",
      subtitle: "Neither",
      color: "#6b7280",
      bgColor: "rgba(107, 114, 128, 0.08)",
      borderColor: "rgba(107, 114, 128, 0.3)",
      icon: "🗑️",
    },
  ];

  function getQuadrantTasks(quadrantId: Quadrant) {
    if (!tasksMatrix.data) return [];

    const keyMap: Record<Quadrant, string> = {
      "urgent-important": "urgentImportant",
      "not-urgent-important": "notUrgentImportant",
      "urgent-not-important": "urgentNotImportant",
      "not-urgent-not-important": "notUrgentNotImportant",
    };

    const tasks =
      tasksMatrix.data[keyMap[quadrantId] as keyof typeof tasksMatrix.data] ||
      [];
    return tasks.filter(
      (task: any) =>
        !optimisticDeletes.has(task._id) && !optimisticToggles.has(task._id),
    );
  }

  async function handleAddTask(e: Event) {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      await client.mutation(api.eisenhower.addTask, {
        text: newTaskText.trim(),
        quadrant: selectedQuadrant,
        notes: newTaskNotes.trim() || undefined,
      });
      newTaskText = "";
      newTaskNotes = "";
      showAddTask = false;
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  }

  async function handleToggleTask(taskId: Id<"eisenhower">) {
    optimisticToggles.add(taskId);
    optimisticToggles = new Set(optimisticToggles);

    try {
      await client.mutation(api.eisenhower.toggleTask, { id: taskId });
      optimisticToggles.delete(taskId);
      optimisticToggles = new Set(optimisticToggles);
    } catch (error) {
      console.error("Failed to toggle task:", error);
      optimisticToggles.delete(taskId);
      optimisticToggles = new Set(optimisticToggles);
    }
  }

  async function handleDeleteTask(taskId: Id<"eisenhower">) {
    optimisticDeletes.add(taskId);
    optimisticDeletes = new Set(optimisticDeletes);

    try {
      await client.mutation(api.eisenhower.deleteTask, { id: taskId });
      optimisticDeletes.delete(taskId);
      optimisticDeletes = new Set(optimisticDeletes);
    } catch (error) {
      console.error("Failed to delete task:", error);
      optimisticDeletes.delete(taskId);
      optimisticDeletes = new Set(optimisticDeletes);
    }
  }

  function openAddTask(quadrant: Quadrant) {
    selectedQuadrant = quadrant;
    showAddTask = true;
  }
</script>

<div class="page">
  <!-- Summary Stats -->
  {#if matrixSummary.data}
    <div class="summary-card card-glass">
      <div class="summary-header">
        <div class="summary-icon">
          <Grid3x3 size={20} style="color: var(--color-accent);" />
        </div>
        <div class="summary-content">
          <div class="summary-value">{matrixSummary.data.totalActive}</div>
          <div class="summary-label">Active Tasks</div>
        </div>
        <div class="summary-stats">
          <div class="stat-mini" style="color: #ef4444;">
            {matrixSummary.data.urgentImportant.total}
          </div>
          <div class="stat-mini" style="color: #3b82f6;">
            {matrixSummary.data.notUrgentImportant.total}
          </div>
          <div class="stat-mini" style="color: #f59e0b;">
            {matrixSummary.data.urgentNotImportant.total}
          </div>
          <div class="stat-mini" style="color: #6b7280;">
            {matrixSummary.data.notUrgentNotImportant.total}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Matrix Grid -->
  <div class="matrix-grid">
    {#each quadrants as quadrant (quadrant.id)}
      {@const tasks = getQuadrantTasks(quadrant.id)}
      <div
        class="quadrant-card card"
        style="background: {quadrant.bgColor}; border-color: {quadrant.borderColor};"
      >
        <!-- Quadrant Header -->
        <div class="quadrant-header">
          <div class="quadrant-icon">{quadrant.icon}</div>
          <div class="quadrant-info">
            <div class="quadrant-title" style="color: {quadrant.color};">
              {quadrant.title}
            </div>
            <div class="quadrant-subtitle">{quadrant.subtitle}</div>
          </div>
          <button
            class="add-task-btn"
            aria-label="Add task to {quadrant.title}"
            onclick={() => openAddTask(quadrant.id)}
            style="color: {quadrant.color};"
          >
            <Plus size={18} />
          </button>
        </div>

        <!-- Tasks List -->
        <div class="tasks-list">
          {#if tasks.length === 0}
            <div class="empty-quadrant">
              <div class="empty-text">No tasks</div>
            </div>
          {:else}
            {#each tasks as task (task._id)}
              <div class="task-item gesture-press">
                <button
                  class="task-checkbox"
                  aria-label="Toggle task"
                  onclick={() => handleToggleTask(task._id)}
                >
                  <div
                    class="checkbox-inner"
                    style="border-color: {quadrant.color};"
                  >
                    {#if task.isCompleted}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke={quadrant.color}
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    {/if}
                  </div>
                </button>
                <div class="task-content">
                  <div class="task-text">{task.text}</div>
                  {#if task.notes}
                    <div class="task-notes">{task.notes}</div>
                  {/if}
                </div>
                <button
                  class="task-delete"
                  aria-label="Delete task"
                  onclick={() => handleDeleteTask(task._id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Task Count -->
        <div class="quadrant-footer">
          <div class="task-count" style="color: {quadrant.color};">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Add Task Modal -->
  {#if showAddTask}
    {@const quadrant = quadrants.find((q) => q.id === selectedQuadrant)}
    <div
      class="modal-overlay"
      onclick={() => (showAddTask = false)}
      onkeydown={(e) => e.key === "Escape" && (showAddTask = false)}
      role="button"
      tabindex="0"
    >
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">{quadrant?.icon}</span>
            <div>
              <h2 class="modal-title">{quadrant?.title}</h2>
              <p class="modal-subtitle">{quadrant?.subtitle}</p>
            </div>
          </div>
          <button
            class="close-btn"
            aria-label="Close"
            onclick={() => (showAddTask = false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <form onsubmit={handleAddTask} class="modal-form">
          <div class="form-group">
            <label class="form-label" for="task-input">Task</label>
            <input
              type="text"
              id="task-input"
              bind:value={newTaskText}
              placeholder="What needs to be done?"
              class="form-input"
              maxlength="200"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="notes-input"
              >Notes <span class="optional">(optional)</span></label
            >
            <textarea
              id="notes-input"
              bind:value={newTaskNotes}
              placeholder="Add details..."
              class="form-textarea"
              maxlength="500"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              onclick={() => (showAddTask = false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={!newTaskText.trim()}
            >
              <Plus size={20} />
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--color-bg-primary);
    padding: 20px;
    padding-bottom: calc(
      var(--spacing-bottom-nav) + env(safe-area-inset-bottom, 0px) + 24px
    );
  }

  /* Summary Card */
  .summary-card {
    padding: 20px;
    margin-bottom: 20px;
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 92, 246, 0.15);
    border-radius: var(--radius-md);
  }

  .summary-content {
    flex: 1;
  }

  .summary-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .summary-label {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-top: 2px;
  }

  .summary-stats {
    display: flex;
    gap: 12px;
  }

  .stat-mini {
    font-size: 18px;
    font-weight: 700;
  }

  /* Matrix Grid */
  .matrix-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .quadrant-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  /* Quadrant Header */
  .quadrant-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .quadrant-icon {
    font-size: 24px;
    line-height: 1;
  }

  .quadrant-info {
    flex: 1;
    min-width: 0;
  }

  .quadrant-title {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 2px;
  }

  .quadrant-subtitle {
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-task-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .add-task-btn:active {
    transform: scale(0.9);
  }

  /* Tasks List */
  .tasks-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    max-height: 300px;
  }

  .empty-quadrant {
    text-align: center;
    padding: 20px;
    color: var(--color-text-tertiary);
  }

  .empty-text {
    font-size: 13px;
  }

  .task-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .task-checkbox {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-top: 2px;
  }

  .checkbox-inner {
    width: 20px;
    height: 20px;
    border: 2px solid;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .task-content {
    flex: 1;
    min-width: 0;
  }

  .task-text {
    font-size: 13px;
    color: var(--color-text-primary);
    line-height: 1.4;
    word-wrap: break-word;
  }

  .task-notes {
    font-size: 11px;
    color: var(--color-text-tertiary);
    margin-top: 4px;
    line-height: 1.4;
  }

  .task-delete {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--transition-fast);
  }

  .task-delete:active {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    transform: scale(0.9);
  }

  /* Quadrant Footer */
  .quadrant-footer {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border-subtle);
  }

  .task-count {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: flex-end;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    width: 100%;
    max-height: 90vh;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 20px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .modal-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .modal-icon {
    font-size: 32px;
  }

  .modal-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.2;
  }

  .modal-subtitle {
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin: 2px 0 0;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-1);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .close-btn:active {
    transform: scale(0.95);
  }

  /* Form */
  .modal-form {
    padding: 24px 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  .optional {
    font-size: 12px;
    font-weight: 400;
    color: var(--color-text-tertiary);
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 12px 16px;
    font-size: 15px;
    font-family: inherit;
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    outline: none;
    transition: all var(--transition-fast);
    resize: vertical;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: var(--color-accent);
    background: var(--color-surface-2);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
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
