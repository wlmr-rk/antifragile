<script lang="ts">
  import {
    AlertCircle,
    Calendar,
    Flame,
    Grid3x3,
    Plus,
    Trash2,
    Users,
  } from "@lucide/svelte";
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
      color: "#f87171",
      bgColor: "rgba(248, 113, 113, 0.08)",
      borderColor: "rgba(248, 113, 113, 0.25)",
      glowColor: "rgba(248, 113, 113, 0.3)",
      icon: Flame,
    },
    {
      id: "not-urgent-important" as Quadrant,
      title: "Schedule",
      subtitle: "Important",
      color: "#60a5fa",
      bgColor: "rgba(96, 165, 250, 0.08)",
      borderColor: "rgba(96, 165, 250, 0.25)",
      glowColor: "rgba(96, 165, 250, 0.3)",
      icon: Calendar,
    },
    {
      id: "urgent-not-important" as Quadrant,
      title: "Delegate",
      subtitle: "Urgent",
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.08)",
      borderColor: "rgba(251, 191, 36, 0.25)",
      glowColor: "rgba(251, 191, 36, 0.3)",
      icon: Users,
    },
    {
      id: "not-urgent-not-important" as Quadrant,
      title: "Eliminate",
      subtitle: "Neither",
      color: "#9ca3af",
      bgColor: "rgba(156, 163, 175, 0.05)",
      borderColor: "rgba(156, 163, 175, 0.15)",
      glowColor: "rgba(156, 163, 175, 0.2)",
      icon: Grid3x3,
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
  <!-- Full Screen Matrix Grid -->
  <div class="matrix-grid">
    {#each quadrants as quadrant (quadrant.id)}
      {@const tasks = getQuadrantTasks(quadrant.id)}
      <div
        class="quadrant-card"
        style="border-color: {quadrant.borderColor}; background: {quadrant.bgColor};"
      >
        <!-- Quadrant Header -->
        <div class="quadrant-header">
          <div class="quadrant-title-row">
            <div class="quadrant-icon" style="color: {quadrant.color};">
              <svelte:component this={quadrant.icon} size={16} strokeWidth={2.5} />
            </div>
            <div class="quadrant-info">
              <div class="quadrant-title">{quadrant.title}</div>
              <div class="quadrant-count" style="color: {quadrant.color};">{tasks.length}</div>
            </div>
          </div>
          <button
            class="add-task-btn"
            aria-label="Add task"
            onclick={() => openAddTask(quadrant.id)}
          >
            <Plus size={16} strokeWidth={2.5} />
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
            <div class="modal-icon" style="color: {quadrant?.color};">
              {#if quadrant?.icon}
                <svelte:component
                  this={quadrant.icon}
                  size={28}
                  strokeWidth={2}
                />
              {/if}
            </div>
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
    background: var(--color-bg-primary);
    height: 100%;
    overflow: hidden;
    padding: 8px;
  }

  .summary-stats {
    display: flex;
    gap: 12px;
  }

  .stat-mini {
    font-size: 18px;
    font-weight: 700;
  }

  /* Matrix Grid - Full Screen */
  .matrix-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 8px;
    height: 100%;
  }

  .quadrant-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.02);
  }

  /* Quadrant Header */
  .quadrant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .quadrant-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .quadrant-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
  }

  .quadrant-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .quadrant-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .quadrant-count {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }

  .add-task-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-task-btn:active {
    transform: scale(0.9);
    background: rgba(255, 255, 255, 0.04);
  }

  /* Tasks List */
  .tasks-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    min-height: 0;
  }

  .empty-quadrant {
    text-align: center;
    padding: 16px 8px;
    color: var(--color-text-tertiary);
  }

  .empty-text {
    font-size: 13px;
  }

  .task-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .task-item:active {
    transform: scale(0.98);
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
    background: rgba(248, 113, 113, 0.15);
    color: var(--color-error);
    transform: scale(0.9);
    box-shadow: 0 0 12px rgba(248, 113, 113, 0.3);
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
    display: flex;
    align-items: center;
    justify-content: center;
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
    box-shadow:
      0 0 0 3px rgba(167, 139, 250, 0.15),
      0 0 16px rgba(167, 139, 250, 0.2);
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
