<script lang="ts">
  import { AlertCircle, Dumbbell, Flame, Frown, Meh, Plus, Smile, Star, Timer, TrendingUp, Zap } from "@lucide/svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import { Button, Input, FloatingActionButton, Modal } from "$lib/components/ui";
  
  const client = useConvexClient();
  let activeTab = $state<"workouts" | "running">("workouts");
  let showAddModal = $state(false);
  // Queries
  const recentWorkouts = useQuery(api.workouts.getRecentWorkouts, {
    limit: 10,
  });
  const workoutStats = useQuery(api.workouts.getWorkoutStats, {});
  const recentRuns = useQuery(api.runs.getRecentRuns, { limit: 10 });
  const runStats = useQuery(api.runs.getRunStats, {});
  // Workout form state
  let workoutName = $state("");
  let workoutDuration = $state(30);
  let workoutNotes = $state("");
  let exercises = $state<Array<{ name: string; sets: number; reps: number }>>([
    { name: "", sets: 3, reps: 10 },
  ]);
  // Running form state
  let runDistance = $state(5);
  let runDuration = $state(30);
  let runFeeling = $state<
    "excellent" | "good" | "okay" | "tough" | "struggled"
  >("good");
  let runNotes = $state("");
  const suggestedExercises = [
    "Push-ups",
    "Pull-ups",
    "Squats",
    "Dips",
    "Lunges",
    "Plank",
    "Burpees",
    "Mountain Climbers",
    "Jumping Jacks",
    "Leg Raises",
  ];
  function addExercise() {
    exercises = [...exercises, { name: "", sets: 3, reps: 10 }];
  }
  function removeExercise(index: number) {
    exercises = exercises.filter((_, i) => i !== index);
  }
  async function handleAddWorkout(e: Event) {
    e.preventDefault();
    if (!workoutName.trim()) return;
    try {
      const workoutId = await client.mutation(api.workouts.addWorkout, {
        name: workoutName.trim(),
        date: Date.now(),
        duration: workoutDuration,
        notes: workoutNotes.trim() || undefined,
      });
      // Add exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (ex.name.trim()) {
          await client.mutation(api.workouts.addExercise, {
            workoutId,
            exerciseName: ex.name.trim(),
            sets: ex.sets,
            reps: ex.reps,
            order: i,
          });
        }
      }
      // Reset form
      workoutName = "";
      workoutDuration = 30;
      workoutNotes = "";
      exercises = [{ name: "", sets: 3, reps: 10 }];
      showAddModal = false;
    } catch (error) {
      console.error("Failed to add workout:", error);
    }
  }
  async function handleAddRun(e: Event) {
    e.preventDefault();
    if (runDistance <= 0 || runDuration <= 0) return;
    try {
      await client.mutation(api.runs.addRun, {
        date: Date.now(),
        distance: runDistance,
        duration: runDuration,
        feeling: runFeeling,
        notes: runNotes.trim() || undefined,
      });
      // Reset form
      runDistance = 5;
      runDuration = 30;
      runFeeling = "good";
      runNotes = "";
      showAddModal = false;
    } catch (error) {
      console.error("Failed to add run:", error);
    }
  }
  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function formatPace(pace: number): string {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  function getFeelingColor(feeling: string): string {
    switch (feeling) {
      case "excellent":
        return "var(--color-success)";
      case "good":
        return "var(--color-info)";
      case "okay":
        return "var(--color-warning)";
      case "tough":
        return "var(--color-error)";
      case "struggled":
        return "var(--color-error)";
      default:
        return "var(--color-text-secondary)";
    }
  }
  function getFeelingIcon(feeling: string) {
    switch (feeling) {
      case "excellent":
        return Flame;
      case "good":
        return Smile;
      case "okay":
        return Meh;
      case "tough":
        return Frown;
      case "struggled":
        return AlertCircle;
      default:
        return Star;
    }
  }
</script>

<div class="page">
  <!-- Tab Navigation -->
  <div class="tabs">
    <button
      class="tab {activeTab === 'workouts' ? 'active' : ''}"
      onclick={() => (activeTab = "workouts")}
    >
      <Dumbbell size={20} />
      Workouts
    </button>
    <button
      class="tab {activeTab === 'running' ? 'active' : ''}"
      onclick={() => (activeTab = "running")}
    >
      <Zap size={20} />
      Running
    </button>
  </div>
  {#if activeTab === "workouts"}
    <!-- Workout Stats -->
    {#if workoutStats.data && workoutStats.data.totalWorkouts > 0}
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-label">Total</div>
          <div class="stat-value">{workoutStats.data.totalWorkouts}</div>
          <div class="stat-sublabel">workouts</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">This Week</div>
          <div class="stat-value">{workoutStats.data.thisWeek}</div>
          <div class="stat-sublabel">sessions</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Avg Duration</div>
          <div class="stat-value">{workoutStats.data.averageDuration}</div>
          <div class="stat-sublabel">minutes</div>
        </div>
      </div>
    {/if}
    <!-- Recent Workouts -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Workouts</h3>
      </div>
      <div class="items-list">
        {#if recentWorkouts.isLoading && !recentWorkouts.data}
          <div class="empty-state">
            <div class="spinner"></div>
            <p>Loading workouts...</p>
          </div>
        {:else if recentWorkouts.data && recentWorkouts.data.length === 0}
          <div class="empty-state">
            <div class="empty-icon">
              <Dumbbell
                size={60}
                strokeWidth={1.5}
                style="color: var(--color-accent);"
              />
            </div>
            <h3 class="empty-title">No Workouts Yet</h3>
            <p class="empty-subtitle">Start tracking your fitness journey</p>
            <Button variant="primary" onclick={() => (showAddModal = true)}>
              <Plus size={20} />
              Log Your First Workout
            </Button>
          </div>
        {:else if recentWorkouts.data}
          {#each recentWorkouts.data as workout (workout._id)}
            <div class="workout-card card gesture-press">
              <div class="workout-header">
                <div class="workout-icon">
                  <Dumbbell size={24} strokeWidth={2} />
                </div>
                <div class="workout-info">
                  <div class="workout-name">{workout.name}</div>
                  <div class="workout-meta">
                    {formatDate(workout.date)} • {workout.duration} min
                  </div>
                </div>
                <div class="workout-badge">
                  <Timer size={14} />
                  {workout.duration}m
                </div>
              </div>
              {#if workout.exercises && workout.exercises.length > 0}
                <div class="exercises-list">
                  {#each workout.exercises as exercise}
                    <div class="exercise-item">
                      <div class="exercise-name">{exercise.exerciseName}</div>
                      <div class="exercise-stats">
                        {exercise.sets} × {exercise.reps}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if workout.notes}
                <div class="workout-notes">{workout.notes}</div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {:else}
    <!-- Running Stats -->
    {#if runStats.data && runStats.data.totalRuns > 0}
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-label">Total Runs</div>
          <div class="stat-value">{runStats.data.totalRuns}</div>
          <div class="stat-sublabel">sessions</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Distance</div>
          <div class="stat-value">{runStats.data.totalDistance.toFixed(1)}</div>
          <div class="stat-sublabel">km</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Best Pace</div>
          <div class="stat-value">{formatPace(runStats.data.fastestPace)}</div>
          <div class="stat-sublabel">min/km</div>
        </div>
      </div>
    {/if}
    <!-- Recent Runs -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Runs</h3>
      </div>
      <div class="items-list">
        {#if recentRuns.isLoading && !recentRuns.data}
          <div class="empty-state">
            <div class="spinner"></div>
            <p>Loading runs...</p>
          </div>
        {:else if recentRuns.data && recentRuns.data.length === 0}
          <div class="empty-state">
            <div class="empty-icon">
              <Zap
                size={60}
                strokeWidth={1.5}
                style="color: var(--color-accent);"
              />
            </div>
            <h3 class="empty-title">No Runs Yet</h3>
            <p class="empty-subtitle">Start tracking your running progress</p>
            <Button variant="primary" onclick={() => (showAddModal = true)}>
              <Plus size={20} />
              Log Your First Run
            </Button>
          </div>
        {:else if recentRuns.data}
          {#each recentRuns.data as run (run._id)}
            <div class="run-card card gesture-press">
              <div class="run-header">
                <div
                  class="run-feeling"
                  style="color: {getFeelingColor(run.feeling || 'good')};"
                >
                  <svelte:component this={getFeelingIcon(run.feeling || "good")} size={28} strokeWidth={2} />
                </div>
                <div class="run-info">
                  <div class="run-stats-main">
                    <span class="run-distance"
                      >{run.distance.toFixed(1)} km</span
                    >
                    <span class="run-divider">•</span>
                    <span class="run-time">{run.duration} min</span>
                  </div>
                  <div class="run-meta">
                    {formatDate(run.date)}
                  </div>
                </div>
                <div class="run-pace-badge">
                  <TrendingUp size={14} />
                  {formatPace(run.pace)}
                </div>
              </div>
              {#if run.notes}
                <div class="run-notes">{run.notes}</div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
  <!-- Floating Action Button -->
  <FloatingActionButton onclick={() => (showAddModal = true)} label={activeTab === "workouts" ? "Add workout" : "Add run"} />

  <!-- Workout Modal -->
  <Modal open={showAddModal && activeTab === "workouts"} onClose={() => (showAddModal = false)} title="Log Workout">
    <form onsubmit={handleAddWorkout} class="fitness-form">
      <div class="form-group">
        <Input
          bind:value={workoutName}
          placeholder="Workout name"
          maxlength={50}
        />
      </div>

      <div class="form-group">
        <label class="form-label">Duration (minutes)</label>
        <div class="counter-compact">
          <button
            type="button"
            class="counter-btn-sm"
            onclick={() => workoutDuration > 5 && (workoutDuration -= 5)}
          >
            −
          </button>
          <input
            type="number"
            class="counter-input"
            bind:value={workoutDuration}
            min="5"
            max="180"
          />
          <button
            type="button"
            class="counter-btn-sm"
            onclick={() => workoutDuration < 180 && (workoutDuration += 5)}
          >
            +
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Exercises</label>
        {#each exercises as exercise, i}
          <div class="exercise-row">
            <input
              type="text"
              bind:value={exercise.name}
              placeholder="Exercise"
              list="exercise-suggestions"
              class="exercise-input"
            />
            <input
              type="number"
              bind:value={exercise.sets}
              placeholder="Sets"
              min="1"
              max="20"
              class="exercise-number"
            />
            <input
              type="number"
              bind:value={exercise.reps}
              placeholder="Reps"
              min="1"
              max="100"
              class="exercise-number"
            />
            {#if exercises.length > 1}
              <button
                type="button"
                class="remove-btn-sm"
                onclick={() => removeExercise(i)}
              >
                ×
              </button>
            {/if}
          </div>
        {/each}
        <button
          type="button"
          class="add-exercise-btn"
          onclick={addExercise}
        >
          <Plus size={16} />
          Add Exercise
        </button>
      </div>

      <datalist id="exercise-suggestions">
        {#each suggestedExercises as exercise}
          <option value={exercise}></option>
        {/each}
      </datalist>

      <div class="modal-actions">
        <Button type="submit" variant="primary" disabled={!workoutName.trim()} class="submit-btn-full">
          <Plus size={20} />
          Log Workout
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Run Modal -->
  <Modal open={showAddModal && activeTab === "running"} onClose={() => (showAddModal = false)} title="Log Run">
    <form onsubmit={handleAddRun} class="fitness-form">
      <div class="form-row">
        <div class="form-group form-group-half">
          <label class="form-label">Distance (km)</label>
          <div class="counter-compact">
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => runDistance > 0.5 && (runDistance = Math.round((runDistance - 0.5) * 10) / 10)}
            >
              −
            </button>
            <input
              type="number"
              class="counter-input"
              bind:value={runDistance}
              min="0.5"
              max="50"
              step="0.1"
            />
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => runDistance < 50 && (runDistance = Math.round((runDistance + 0.5) * 10) / 10)}
            >
              +
            </button>
          </div>
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Duration (min)</label>
          <div class="counter-compact">
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => runDuration > 5 && (runDuration -= 5)}
            >
              −
            </button>
            <input
              type="number"
              class="counter-input"
              bind:value={runDuration}
              min="5"
              max="300"
            />
            <button
              type="button"
              class="counter-btn-sm"
              onclick={() => runDuration < 300 && (runDuration += 5)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">How did it feel?</label>
        <div class="feeling-grid">
          {#each ["excellent", "good", "okay", "tough", "struggled"] as feeling}
            <button
              type="button"
              class="feeling-btn-compact {runFeeling === feeling ? 'active' : ''}"
              onclick={() => (runFeeling = feeling)}
            >
              <svelte:component this={getFeelingIcon(feeling)} size={18} strokeWidth={2.5} />
            </button>
          {/each}
        </div>
      </div>

      <div class="pace-display-compact">
        <span class="pace-label-sm">Pace:</span>
        <span class="pace-value-sm">{formatPace(runDuration / runDistance)} min/km</span>
      </div>

      <div class="modal-actions">
        <Button type="submit" variant="primary" class="submit-btn-full">
          <Plus size={20} />
          Log Run
        </Button>
      </div>
    </form>
  </Modal>
</div>

<style>
  .page {
    background: var(--color-bg-primary);
    padding: 16px;
    padding-bottom: 24px;
  }
  /* Tabs */
  .tabs {
    display: flex;
    gap: 8px;
    padding: 20px 20px 16px;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    font-size: 15px;
    font-weight: 600;
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .tab.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
    box-shadow: var(--glow-accent);
  }
  .tab:active {
    transform: scale(0.98);
  }
  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 20px;
  }
  .stat-card {
    padding: 16px;
    text-align: center;
  }
  .stat-label {
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }
  .stat-sublabel {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 4px;
  }
  /* Section */
  .section {
    padding: 0 20px;
  }
  .section-header {
    margin-bottom: 16px;
  }
  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }
  .items-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  /* Workout Card */
  .workout-card {
    padding: 16px;
  }
  .workout-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .workout-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
  }
  .workout-info {
    flex: 1;
  }
  .workout-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 2px;
  }
  .workout-meta {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
  .workout-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-warning);
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-full);
  }
  .exercises-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--color-surface-1);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
  }
  .exercise-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .exercise-name {
    font-size: 14px;
    color: var(--color-text-primary);
  }
  .exercise-stats {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .workout-notes {
    font-size: 13px;
    color: var(--color-text-secondary);
    padding-top: 8px;
    border-top: 1px solid var(--color-border-subtle);
  }
  /* Run Card */
  .run-card {
    padding: 16px;
  }
  .run-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .run-feeling {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .run-info {
    flex: 1;
  }
  .run-stats-main {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 2px;
  }
  .run-distance {
    color: var(--color-accent);
  }
  .run-divider {
    color: var(--color-text-tertiary);
    margin: 0 6px;
  }
  .run-meta {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
  .run-pace-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-info);
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-full);
  }
  .run-notes {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-subtle);
  }
  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }
  .empty-icon {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
  }
  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }
  .empty-subtitle {
    font-size: 14px;
    color: var(--color-text-tertiary);
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

  .counter-btn:active {
    transform: scale(0.95);
  }

  .counter-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-text-primary);
    min-width: 60px;
    text-align: center;
  }

  /* Exercise Inputs */
  .exercise-input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .exercise-name-input {
    flex: 2;
  }

  .exercise-number-input {
    flex: 1;
    min-width: 60px;
  }

  .remove-btn {
    width: 36px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    color: var(--color-error);
    cursor: pointer;
  }

  .btn-small {
    padding: 8px 16px;
    font-size: 14px;
  }

  /* Feeling Buttons */
  .feeling-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .feeling-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--color-surface-1);
    border: 2px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 20px;
  }

  .feeling-btn.active {
    border-color: var(--color-accent);
    background: var(--color-surface-2);
  }

  .feeling-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    text-transform: capitalize;
  }

  /* Pace Display */
  .pace-display {
    text-align: center;
    padding: 20px;
    background: var(--color-surface-1);
    border-radius: var(--radius-lg);
    margin-bottom: 24px;
  }

  .pace-label {
    font-size: 12px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .pace-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--color-accent);
  }

  .pace-unit {
    font-size: 16px;
    color: var(--color-text-secondary);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
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

  /* Compact Fitness Forms */
  .fitness-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
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
    margin-bottom: 6px;
  }

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

  .exercise-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .exercise-input {
    flex: 2;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    outline: none;
  }

  .exercise-number {
    flex: 1;
    padding: 10px 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    text-align: center;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    outline: none;
  }

  .remove-btn-sm {
    width: 32px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: rgba(248, 113, 113, 0.1);
    color: var(--color-error);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .remove-btn-sm:active {
    transform: scale(0.95);
    background: rgba(248, 113, 113, 0.2);
  }

  .add-exercise-btn {
    width: 100%;
    padding: 10px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-secondary);
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-exercise-btn:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.06);
  }

  .feeling-grid {
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }

  .feeling-btn-compact {
    flex: 1;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .feeling-btn-compact.active {
    background: var(--color-accent);
    color: #000000;
    border-color: var(--color-accent);
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.4);
  }

  .feeling-btn-compact:active {
    transform: scale(0.95);
  }

  .pace-display-compact {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
  }

  .pace-label-sm {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pace-value-sm {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-accent);
  }

  :global(.submit-btn-full) {
    flex: 1;
  }
</style>
