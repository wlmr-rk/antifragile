<script lang="ts">
  import { Plus, Repeat, Target, Trash2 } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";

  const client = useConvexClient();
  const habitsProgress = useQuery(api.habits.getTodayProgress, {});
  const habitsSummary = useQuery(api.habits.getHabitsSummary, {});

  let showAddHabit = $state(false);
  let newHabitName = $state("");
  let newHabitDescription = $state("");
  let selectedColor = $state("#8b5cf6");
  let selectedFrequency = $state<"daily" | "weekly" | "monthly">("daily");
  let targetCount = $state(1);

  const colors = [
    { name: "Purple", value: "#8b5cf6" },
    { name: "Green", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Yellow", value: "#eab308" },
  ];

  // Optimistic state
  let optimisticCompletions = $state<Set<Id<"habits">>>(new Set());

  const habitsWithOptimistic = $derived(() => {
    if (!habitsProgress.data) return [];
    return habitsProgress.data.map((habit) => ({
      ...habit,
      completedToday:
        habit.completedToday + (optimisticCompletions.has(habit._id) ? 1 : 0),
      isComplete:
        habit.completedToday + (optimisticCompletions.has(habit._id) ? 1 : 0) >=
        habit.targetCount,
    }));
  });

  async function handleCompleteHabit(habitId: Id<"habits">) {
    optimisticCompletions.add(habitId);
    optimisticCompletions = new Set(optimisticCompletions);

    try {
      await client.mutation(api.habits.completeHabit, { habitId });
      optimisticCompletions.delete(habitId);
      optimisticCompletions = new Set(optimisticCompletions);
    } catch (error) {
      console.error("Failed to complete habit:", error);
      optimisticCompletions.delete(habitId);
      optimisticCompletions = new Set(optimisticCompletions);
    }
  }

  async function handleAddHabit(e: Event) {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      await client.mutation(api.habits.addHabit, {
        name: newHabitName.trim(),
        description: newHabitDescription.trim() || undefined,
        color: selectedColor,
        frequency: selectedFrequency,
        targetCount: targetCount,
      });

      // Reset form
      newHabitName = "";
      newHabitDescription = "";
      selectedColor = "#8b5cf6";
      selectedFrequency = "daily";
      targetCount = 1;
      showAddHabit = false;
    } catch (error) {
      console.error("Failed to add habit:", error);
    }
  }

  async function handleDeleteHabit(habitId: Id<"habits">) {
    if (!confirm("Delete this habit and all its history?")) return;

    try {
      await client.mutation(api.habits.deleteHabit, { id: habitId });
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  }

  function getProgressPercentage(completed: number, target: number): number {
    return Math.min((completed / target) * 100, 100);
  }

  function getStrokeColor(habit: any): string {
    return habit.isComplete ? habit.color : `${habit.color}80`;
  }
</script>

<div class="page">
  <!-- Summary Stats -->
  {#if habitsSummary.data && habitsSummary.data.totalHabits > 0}
    <div class="summary-card card-glass">
      <div class="summary-header">
        <div class="summary-icon">
          <Target size={20} style="color: var(--color-success);" />
        </div>
        <div class="summary-content">
          <div class="summary-value">
            {habitsSummary.data.totalCompleted}/{habitsSummary.data.totalTarget}
          </div>
          <div class="summary-label">Completed Today</div>
        </div>
        <div class="summary-percentage">
          <span
            class="percentage-value"
            style="color: {habitsSummary.data.percentage >= 100
              ? 'var(--color-success)'
              : 'var(--color-accent)'};"
          >
            {habitsSummary.data.percentage}%
          </span>
        </div>
      </div>
      <div class="progress-bar">
        <div
          class="progress-bar-fill"
          style="width: {habitsSummary.data
            .percentage}%; background: {habitsSummary.data.percentage >= 100
            ? 'var(--color-success)'
            : 'var(--color-accent)'};"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Habits List -->
  <div class="habits-list">
    {#if habitsProgress.isLoading && !habitsProgress.data}
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Loading habits...</p>
      </div>
    {:else if habitsWithOptimistic().length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <Target
            size={80}
            strokeWidth={1.5}
            style="color: var(--color-accent);"
          />
        </div>
        <h3 class="empty-title">No Habits Yet</h3>
        <p class="empty-subtitle">
          Start building better habits<br />
          Track your progress daily
        </p>
        <button class="btn-primary" onclick={() => (showAddHabit = true)}>
          <Plus size={20} />
          Add Your First Habit
        </button>
      </div>
    {:else}
      {#each habitsWithOptimistic() as habit (habit._id)}
        <div
          class="habit-card card gesture-press"
          class:complete={habit.isComplete}
        >
          <!-- Progress Ring -->
          <button
            class="habit-ring-btn"
            onclick={() =>
              habit.completedToday < habit.targetCount &&
              handleCompleteHabit(habit._id)}
            disabled={habit.completedToday >= habit.targetCount}
          >
            <svg class="habit-ring" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--color-surface-2)"
                stroke-width="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={habit.color}
                stroke-width="8"
                stroke-dasharray="{getProgressPercentage(
                  habit.completedToday,
                  habit.targetCount,
                ) * 2.51}, 251"
                stroke-linecap="round"
                transform="rotate(-90 50 50)"
                class="progress-circle"
                style="opacity: {habit.isComplete ? 1 : 0.7};"
              />
              {#if habit.isComplete}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill={habit.color}
                  opacity="0.15"
                />
              {/if}
            </svg>
            <div class="ring-content">
              {#if habit.isComplete}
                <div class="check-icon" style="color: {habit.color};">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l5 5L20 7"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              {:else}
                <div class="count-display">
                  <span class="count-value">{habit.completedToday}</span>
                  <span class="count-target">/{habit.targetCount}</span>
                </div>
              {/if}
            </div>
          </button>

          <!-- Habit Info -->
          <div class="habit-info">
            <div class="habit-name">{habit.name}</div>
            {#if habit.description}
              <div class="habit-description">{habit.description}</div>
            {/if}
            <div class="habit-meta">
              <div class="meta-tag">
                <Repeat size={12} />
                {habit.frequency}
              </div>
              {#if habit.targetCount > 1}
                <div class="meta-tag">
                  {habit.targetCount}x per {habit.frequency === "daily"
                    ? "day"
                    : habit.frequency === "weekly"
                      ? "week"
                      : "month"}
                </div>
              {/if}
            </div>
          </div>

          <!-- Delete Button -->
          <button
            class="delete-btn-habit"
            onclick={() => handleDeleteHabit(habit._id)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Add Habit Panel -->
  {#if showAddHabit}
    <div class="modal-overlay" onclick={() => (showAddHabit = false)}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">New Habit</h2>
          <button class="close-btn" onclick={() => (showAddHabit = false)}>
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

        <form onsubmit={handleAddHabit} class="modal-form">
          <!-- Habit Name -->
          <div class="form-group">
            <label class="form-label">Habit Name</label>
            <input
              type="text"
              bind:value={newHabitName}
              placeholder="e.g., Morning Meditation"
              class="form-input"
              maxlength="50"
              autofocus
            />
          </div>

          <!-- Description (Optional) -->
          <div class="form-group">
            <label class="form-label"
              >Description <span class="optional">(optional)</span></label
            >
            <input
              type="text"
              bind:value={newHabitDescription}
              placeholder="e.g., 10 minutes of mindfulness"
              class="form-input"
              maxlength="100"
            />
          </div>

          <!-- Color Selection -->
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-grid">
              {#each colors as color}
                <button
                  type="button"
                  class="color-option {selectedColor === color.value
                    ? 'selected'
                    : ''}"
                  style="background: {color.value};"
                  onclick={() => (selectedColor = color.value)}
                  aria-label={color.name}
                >
                  {#if selectedColor === color.value}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8l3 3 7-7"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Frequency -->
          <div class="form-group">
            <label class="form-label">Frequency</label>
            <div class="button-group">
              <button
                type="button"
                class="group-btn {selectedFrequency === 'daily'
                  ? 'active'
                  : ''}"
                onclick={() => (selectedFrequency = "daily")}
              >
                Daily
              </button>
              <button
                type="button"
                class="group-btn {selectedFrequency === 'weekly'
                  ? 'active'
                  : ''}"
                onclick={() => (selectedFrequency = "weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                class="group-btn {selectedFrequency === 'monthly'
                  ? 'active'
                  : ''}"
                onclick={() => (selectedFrequency = "monthly")}
              >
                Monthly
              </button>
            </div>
          </div>

          <!-- Target Count -->
          <div class="form-group">
            <label class="form-label">Target Count</label>
            <div class="counter">
              <button
                type="button"
                class="counter-btn"
                onclick={() => targetCount > 1 && (targetCount -= 1)}
                disabled={targetCount <= 1}
              >
                −
              </button>
              <div class="counter-value">{targetCount}</div>
              <button
                type="button"
                class="counter-btn"
                onclick={() => targetCount < 10 && (targetCount += 1)}
                disabled={targetCount >= 10}
              >
                +
              </button>
            </div>
            <div class="form-hint">
              Complete this habit {targetCount}x per {selectedFrequency ===
              "daily"
                ? "day"
                : selectedFrequency === "weekly"
                  ? "week"
                  : "month"}
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              onclick={() => (showAddHabit = false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={!newHabitName.trim()}
            >
              <Plus size={20} />
              Create Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Floating Add Button -->
  <button class="fab" onclick={() => (showAddHabit = true)}>
    <Plus size={24} strokeWidth={2.5} />
  </button>
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
    margin-bottom: 12px;
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(16, 185, 129, 0.15);
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

  .summary-percentage {
    font-size: 28px;
    font-weight: 700;
  }

  .progress-bar {
    height: 6px;
    background: var(--color-surface-2);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease-out;
  }

  /* Habits List */
  .habits-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .habit-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
  }

  .habit-card.complete {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.05);
  }

  /* Progress Ring */
  .habit-ring-btn {
    position: relative;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .habit-ring-btn:disabled {
    cursor: default;
  }

  .habit-ring {
    width: 100%;
    height: 100%;
  }

  .progress-circle {
    transition: stroke-dasharray 0.3s ease-out;
  }

  .ring-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .check-icon {
    animation: scaleIn 0.3s ease-out;
  }

  .count-display {
    text-align: center;
  }

  .count-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .count-target {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-tertiary);
  }

  /* Habit Info */
  .habit-info {
    flex: 1;
    min-width: 0;
  }

  .habit-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 4px;
  }

  .habit-description {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-bottom: 6px;
  }

  .habit-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .meta-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    border-radius: var(--radius-full);
    text-transform: capitalize;
  }

  .delete-btn-habit {
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

  .delete-btn-habit:active {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    transform: scale(0.9);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }

  .empty-icon {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
  }

  .empty-title {
    font-size: 22px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 12px;
  }

  .empty-subtitle {
    font-size: 15px;
    color: var(--color-text-tertiary);
    line-height: 1.6;
    margin-bottom: 24px;
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

  .modal-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
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
    margin-bottom: 24px;
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

  .form-input {
    width: 100%;
    padding: 12px 16px;
    font-size: 15px;
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    outline: none;
    transition: all var(--transition-fast);
  }

  .form-input:focus {
    border-color: var(--color-accent);
    background: var(--color-surface-2);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  .form-hint {
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin-top: 6px;
  }

  /* Color Grid */
  .color-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .color-option {
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    border: 3px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .color-option.selected {
    border-color: white;
    box-shadow:
      0 0 0 2px var(--color-bg-elevated),
      0 0 0 4px currentColor;
  }

  .color-option:active {
    transform: scale(0.95);
  }

  /* Button Group */
  .button-group {
    display: flex;
    gap: 8px;
  }

  .group-btn {
    flex: 1;
    padding: 10px;
    font-size: 14px;
    font-weight: 500;
    background: var(--color-surface-1);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .group-btn.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }

  .group-btn:active {
    transform: scale(0.98);
  }

  /* Counter */
  .counter {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: center;
    padding: 16px;
    background: var(--color-surface-1);
    border-radius: var(--radius-lg);
  }

  .counter-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 600;
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .counter-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .counter-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .counter-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-text-primary);
    min-width: 60px;
    text-align: center;
  }

  /* Modal Actions */
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 32px;
  }

  /* FAB */
  .fab {
    position: fixed;
    bottom: calc(
      var(--spacing-bottom-nav) + env(safe-area-inset-bottom, 0px) + 24px
    );
    right: 20px;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 50%;
    box-shadow: var(--shadow-xl), var(--glow-accent);
    cursor: pointer;
    transition: all var(--transition-fast);
    z-index: 100;
  }

  .fab:active {
    transform: scale(0.9);
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

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
