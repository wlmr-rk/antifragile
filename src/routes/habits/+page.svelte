<script lang="ts">
  import { Plus, Repeat, Target, Trash2 } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import { Button, Input, Textarea, FloatingActionButton, Modal } from "$lib/components/ui";

  const client = useConvexClient();
  const habitsProgress = useQuery(api.habits.getTodayProgress, {});
  const habitsSummary = useQuery(api.habits.getHabitsSummary, {});

  let showAddModal = $state(false);
  let newHabitName = $state("");
  let newHabitDescription = $state("");
  let selectedColor = $state("#a78bfa");
  let selectedFrequency = $state<"daily" | "weekly" | "monthly">("daily");
  let targetCount = $state(1);
  let selectedUnit = $state("count");

  const colors = [
    { name: "Purple", value: "#a78bfa" },
    { name: "Green", value: "#34d399" },
    { name: "Blue", value: "#60a5fa" },
    { name: "Cyan", value: "#22d3ee" },
    { name: "Pink", value: "#f472b6" },
    { name: "Orange", value: "#fb923c" },
    { name: "Red", value: "#f87171" },
    { name: "Black", value: "#1a1a1a" },
  ];

  const units = [
    { name: "Count", value: "count" },
    { name: "Liters", value: "liters" },
    { name: "Hours", value: "hours" },
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
      selectedColor = "#a78bfa";
      selectedFrequency = "daily";
      targetCount = 1;
      selectedUnit = "count";
      showAddModal = false;
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
        <Button variant="primary" onclick={() => (showAddModal = true)}>
          <Plus size={20} />
          Add Your First Habit
        </Button>
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

  <!-- Floating Action Button -->
  <FloatingActionButton onclick={() => (showAddModal = true)} label="Add habit" />

  <!-- Add Habit Modal -->
  <Modal open={showAddModal} onClose={() => (showAddModal = false)} title="New Habit">
    <form onsubmit={handleAddHabit} class="habit-form">
      <!-- Habit Name -->
      <div class="form-group">
        <Input
          bind:value={newHabitName}
          placeholder="Habit name"
          maxlength={50}
        />
      </div>

      <!-- Color & Frequency Row -->
      <div class="form-row">
        <div class="form-group form-group-half">
          <label class="form-label">Color</label>
          <div class="color-selector">
            {#each colors as color}
              <button
                type="button"
                class="color-dot {selectedColor === color.value ? 'selected' : ''}"
                style="background: {color.value};"
                onclick={() => (selectedColor = color.value)}
                aria-label={color.name}
              />
            {/each}
          </div>
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Frequency</label>
          <select
            class="select-input"
            bind:value={selectedFrequency}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <!-- Target & Unit Row -->
      <div class="form-row">
        <div class="form-group form-group-half">
          <label class="form-label">Target</label>
          <div class="counter-compact">
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => targetCount > 1 && (targetCount -= 1)}
              disabled={targetCount <= 1}
            >
              −
            </button>
            <input
              type="number"
              class="counter-input"
              bind:value={targetCount}
              min="1"
              max="99"
            />
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => targetCount < 99 && (targetCount += 1)}
              disabled={targetCount >= 99}
            >
              +
            </button>
          </div>
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Unit</label>
          <select
            class="select-input"
            bind:value={selectedUnit}
          >
            {#each units as unit}
              <option value={unit.value}>{unit.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <Button type="submit" variant="primary" disabled={!newHabitName.trim()} class="submit-btn-full">
          <Plus size={20} />
          Create Habit
        </Button>
      </div>
    </form>
  </Modal>
</div>

<style>
  .page {
    background: var(--color-bg-primary);
    padding: 20px;
    padding-bottom: 24px;
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

  /* Habit Form */
  .habit-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-group-half {
    flex: 1;
  }

  .form-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Color Selector - Minimal Dots */
  .color-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .color-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .color-dot.selected {
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 16px currentColor, 0 2px 8px rgba(0, 0, 0, 0.6);
    transform: scale(1.1);
  }

  .color-dot:active {
    transform: scale(0.95);
  }

  /* Select Input */
  .select-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }

  .select-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.3);
  }



  /* Compact Counter */
  .counter-compact {
    display: flex;
    align-items: center;
    gap: 0;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    overflow: hidden;
  }

  .counter-btn-sm {
    width: 36px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    background: transparent;
    color: var(--color-text-primary);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .counter-btn-sm:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .counter-btn-sm:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }

  .counter-input {
    flex: 1;
    height: 38px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    outline: none;
    -moz-appearance: textfield;
  }

  .counter-input::-webkit-outer-spin-button,
  .counter-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Modal Actions */
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
</style>
