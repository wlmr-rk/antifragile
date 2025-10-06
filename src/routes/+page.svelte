<script lang="ts">
  import {
    BarChart3,
    Calendar,
    CheckCircle,
    Flame,
    Target,
    TrendingUp,
  } from "@lucide/svelte";
  import { useQuery } from "convex-svelte";
  import { api } from "../convex/_generated/api";

  // Fetch data from all modules
  const todos = useQuery(api.todos.getTodos, { includeCompleted: true });
  const dailySummary = useQuery(api.todos.getDailyTasksSummary, {});
  const habitsSummary = useQuery(api.habits.getHabitsSummary, {});
  const runStats = useQuery(api.runs.getRunStats, {});
  const workoutStats = useQuery(api.workouts.getWorkoutStats, {});
  const matrixSummary = useQuery(api.eisenhower.getMatrixSummary, {});

  // Calculate productivity score (0-100)
  const productivityScore = $derived(() => {
    let score = 0;
    let maxScore = 0;

    // Todos contribution (25 points)
    if (dailySummary.data) {
      score += (dailySummary.data.percentage / 100) * 25;
      maxScore += 25;
    }

    // Habits contribution (25 points)
    if (habitsSummary.data) {
      score += (habitsSummary.data.percentage / 100) * 25;
      maxScore += 25;
    }

    // Workouts contribution (25 points)
    if (workoutStats.data && workoutStats.data.thisWeek > 0) {
      const workoutScore = Math.min((workoutStats.data.thisWeek / 5) * 25, 25);
      score += workoutScore;
      maxScore += 25;
    }

    // Running contribution (25 points)
    if (runStats.data && runStats.data.thisWeek > 0) {
      const runScore = Math.min((runStats.data.thisWeek / 3) * 25, 25);
      score += runScore;
      maxScore += 25;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  });

  // Get score color
  function getScoreColor(score: number): string {
    if (score >= 80) return "var(--color-success)";
    if (score >= 60) return "var(--color-info)";
    if (score >= 40) return "var(--color-warning)";
    return "var(--color-error)";
  }

  // Calculate completion rate
  const completionRate = $derived(() => {
    if (!todos.data) return 0;
    const completed = todos.data.filter((t) => t.isCompleted).length;
    const total = todos.data.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  // Weekly activity data (mock for visualization)
  const weeklyActivity = [
    { day: "Mon", todos: 5, habits: 3, workouts: 1 },
    { day: "Tue", todos: 7, habits: 4, workouts: 0 },
    { day: "Wed", todos: 6, habits: 3, workouts: 1 },
    { day: "Thu", todos: 8, habits: 4, workouts: 1 },
    { day: "Fri", todos: 4, habits: 3, workouts: 0 },
    { day: "Sat", todos: 3, habits: 2, workouts: 1 },
    { day: "Sun", todos: 2, habits: 2, workouts: 1 },
  ];

  const maxActivity = Math.max(
    ...weeklyActivity.map((d) => d.todos + d.habits + d.workouts),
  );
</script>

<div class="page">
  <div class="content">
    <!-- Productivity Score Card -->
    <div class="score-card card-glass depth-3">
      <div class="score-header">
        <div class="score-icon">
          <TrendingUp size={24} />
        </div>
        <div>
          <div class="score-label">Productivity Score</div>
          <div class="score-subtitle">Based on all activities</div>
        </div>
      </div>

      <div class="score-display">
        <svg class="score-ring" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="var(--color-surface-2)"
            stroke-width="16"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={getScoreColor(productivityScore())}
            stroke-width="16"
            stroke-dasharray="{(productivityScore() / 100) * 502.65} 502.65"
            stroke-linecap="round"
            transform="rotate(-90 100 100)"
            class="score-progress"
            style="filter: drop-shadow(0 0 8px {getScoreColor(
              productivityScore(),
            )}40);"
          />
        </svg>
        <div class="score-value">
          <span
            class="score-number"
            style="color: {getScoreColor(productivityScore())};"
          >
            {productivityScore()}
          </span>
          <span class="score-percent">%</span>
        </div>
      </div>

      <div class="score-insights">
        {#if productivityScore() >= 80}
          <div class="insight-badge badge-success">🔥 On Fire!</div>
        {:else if productivityScore() >= 60}
          <div class="insight-badge badge-primary">💪 Strong</div>
        {:else if productivityScore() >= 40}
          <div class="insight-badge badge-warning">📈 Building</div>
        {:else}
          <div class="insight-badge badge-error">🎯 Focus Needed</div>
        {/if}
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="stats-grid">
      <!-- Todos Stat -->
      <div class="stat-card card">
        <div class="stat-icon" style="background: rgba(139, 92, 246, 0.15);">
          <CheckCircle size={20} style="color: var(--color-accent);" />
        </div>
        <div class="stat-content">
          <div class="stat-value">
            {dailySummary.data?.completed ?? 0}/{dailySummary.data?.total ?? 0}
          </div>
          <div class="stat-label">Daily Tasks</div>
        </div>
        <div class="stat-trend">
          <div class="mini-bar">
            <div
              class="mini-bar-fill"
              style="width: {dailySummary.data?.percentage ??
                0}%; background: var(--color-accent);"
            ></div>
          </div>
        </div>
      </div>

      <!-- Habits Stat -->
      <div class="stat-card card">
        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15);">
          <Target size={20} style="color: var(--color-success);" />
        </div>
        <div class="stat-content">
          <div class="stat-value">
            {habitsSummary.data?.totalCompleted ?? 0}/{habitsSummary.data
              ?.totalTarget ?? 0}
          </div>
          <div class="stat-label">Habits Done</div>
        </div>
        <div class="stat-trend">
          <div class="mini-bar">
            <div
              class="mini-bar-fill"
              style="width: {habitsSummary.data?.percentage ??
                0}%; background: var(--color-success);"
            ></div>
          </div>
        </div>
      </div>

      <!-- Workouts Stat -->
      <div class="stat-card card">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15);">
          <Flame size={20} style="color: var(--color-warning);" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{workoutStats.data?.thisWeek ?? 0}</div>
          <div class="stat-label">Workouts</div>
        </div>
        <div class="stat-trend">
          <span class="trend-text">This week</span>
        </div>
      </div>

      <!-- Running Stat -->
      <div class="stat-card card">
        <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15);">
          <BarChart3 size={20} style="color: var(--color-info);" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{runStats.data?.thisWeek ?? 0}</div>
          <div class="stat-label">Runs</div>
        </div>
        <div class="stat-trend">
          <span class="trend-text">This week</span>
        </div>
      </div>
    </div>

    <!-- Weekly Activity Chart -->
    <div class="chart-card card-glass">
      <div class="chart-header">
        <div class="chart-title">
          <Calendar size={20} />
          Weekly Activity
        </div>
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--color-accent);"
            ></span>
            Todos
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--color-success);"
            ></span>
            Habits
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--color-warning);"
            ></span>
            Workouts
          </div>
        </div>
      </div>

      <div class="chart">
        <div class="chart-bars">
          {#each weeklyActivity as day}
            <div class="bar-group">
              <div class="bar-stack">
                {#if day.workouts > 0}
                  <div
                    class="bar-segment"
                    style="height: {(day.workouts / maxActivity) *
                      100}%; background: var(--color-warning);"
                    title="Workouts: {day.workouts}"
                  ></div>
                {/if}
                {#if day.habits > 0}
                  <div
                    class="bar-segment"
                    style="height: {(day.habits / maxActivity) *
                      100}%; background: var(--color-success);"
                    title="Habits: {day.habits}"
                  ></div>
                {/if}
                {#if day.todos > 0}
                  <div
                    class="bar-segment"
                    style="height: {(day.todos / maxActivity) *
                      100}%; background: var(--color-accent);"
                    title="Todos: {day.todos}"
                  ></div>
                {/if}
              </div>
              <div class="bar-label">{day.day}</div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Focus Distribution (Eisenhower) -->
    {#if matrixSummary.data}
      <div class="chart-card card-glass">
        <div class="chart-header">
          <div class="chart-title">
            <BarChart3 size={20} />
            Focus Distribution
          </div>
          <div class="chart-subtitle">Eisenhower Matrix</div>
        </div>

        <div class="matrix-grid">
          <div
            class="matrix-quadrant"
            style="border-color: var(--color-error);"
          >
            <div class="matrix-label">Do First</div>
            <div class="matrix-value">
              {matrixSummary.data.urgentImportant.total}
            </div>
            <div class="matrix-sublabel">Urgent + Important</div>
          </div>
          <div class="matrix-quadrant" style="border-color: var(--color-info);">
            <div class="matrix-label">Schedule</div>
            <div class="matrix-value">
              {matrixSummary.data.notUrgentImportant.total}
            </div>
            <div class="matrix-sublabel">Important</div>
          </div>
          <div
            class="matrix-quadrant"
            style="border-color: var(--color-warning);"
          >
            <div class="matrix-label">Delegate</div>
            <div class="matrix-value">
              {matrixSummary.data.urgentNotImportant.total}
            </div>
            <div class="matrix-sublabel">Urgent</div>
          </div>
          <div
            class="matrix-quadrant"
            style="border-color: var(--color-text-tertiary);"
          >
            <div class="matrix-label">Eliminate</div>
            <div class="matrix-value">
              {matrixSummary.data.notUrgentNotImportant.total}
            </div>
            <div class="matrix-sublabel">Neither</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Correlations & Insights -->
    <div class="insights-card card-glass">
      <div class="chart-header">
        <div class="chart-title">
          <TrendingUp size={20} />
          Insights & Correlations
        </div>
      </div>

      <div class="insights-list">
        {#if workoutStats.data && workoutStats.data.thisWeek > 0 && completionRate() > 70}
          <div class="insight-item">
            <div class="insight-icon success">💪</div>
            <div class="insight-content">
              <div class="insight-text">
                <strong>Workout Boost</strong> - {workoutStats.data.thisWeek} workouts
                this week correlates with {completionRate()}% task completion
              </div>
              <div class="insight-bar">
                <div class="insight-bar-fill success" style="width: 85%;"></div>
              </div>
            </div>
          </div>
        {/if}

        {#if habitsSummary.data && habitsSummary.data.percentage > 80}
          <div class="insight-item">
            <div class="insight-icon success">🔥</div>
            <div class="insight-content">
              <div class="insight-text">
                <strong>Habit Streak</strong> - {habitsSummary.data.percentage}%
                habit completion shows strong consistency
              </div>
              <div class="insight-bar">
                <div
                  class="insight-bar-fill success"
                  style="width: {habitsSummary.data.percentage}%;"
                ></div>
              </div>
            </div>
          </div>
        {/if}

        {#if runStats.data && runStats.data.thisWeek >= 3}
          <div class="insight-item">
            <div class="insight-icon info">🏃</div>
            <div class="insight-content">
              <div class="insight-text">
                <strong>Running Rhythm</strong> - {runStats.data.thisWeek} runs per
                week enhances mental clarity
              </div>
              <div class="insight-bar">
                <div class="insight-bar-fill info" style="width: 75%;"></div>
              </div>
            </div>
          </div>
        {/if}

        {#if dailySummary.data && dailySummary.data.percentage < 50}
          <div class="insight-item">
            <div class="insight-icon warning">⚡</div>
            <div class="insight-content">
              <div class="insight-text">
                <strong>Focus Opportunity</strong> - {dailySummary.data
                  .remaining} daily tasks remaining
              </div>
              <div class="insight-bar">
                <div class="insight-bar-fill warning" style="width: 40%;"></div>
              </div>
            </div>
          </div>
        {/if}

        {#if !habitsSummary.data || habitsSummary.data.totalHabits === 0}
          <div class="insight-item">
            <div class="insight-icon neutral">🎯</div>
            <div class="insight-content">
              <div class="insight-text">
                <strong>Build Habits</strong> - Start tracking habits to build consistent
                routines
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--color-bg-primary);
  }

  .content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Score Card */
  .score-card {
    padding: 24px;
    text-align: center;
  }

  .score-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .score-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 92, 246, 0.15);
    border-radius: var(--radius-md);
    color: var(--color-accent);
  }

  .score-label {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .score-subtitle {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }

  .score-display {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 0 auto 20px;
  }

  .score-ring {
    width: 100%;
    height: 100%;
  }

  .score-progress {
    transition:
      stroke-dasharray 1s ease-out,
      stroke 0.3s ease;
  }

  .score-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .score-number {
    font-size: 56px;
    font-weight: 700;
    line-height: 1;
    display: block;
  }

  .score-percent {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .score-insights {
    display: flex;
    justify-content: center;
  }

  .insight-badge {
    padding: 8px 16px;
    border-radius: var(--radius-full);
    font-size: 14px;
    font-weight: 600;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .stat-trend {
    margin-top: auto;
  }

  .mini-bar {
    height: 4px;
    background: var(--color-surface-2);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .mini-bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease-out;
  }

  .trend-text {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  /* Chart Card */
  .chart-card {
    padding: 20px;
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .chart-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .chart-subtitle {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }

  .chart-legend {
    display: flex;
    gap: 16px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  /* Bar Chart */
  .chart {
    width: 100%;
  }

  .chart-bars {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 160px;
    gap: 8px;
    padding: 0 4px;
  }

  .bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .bar-stack {
    width: 100%;
    height: 140px;
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-start;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    overflow: hidden;
  }

  .bar-segment {
    width: 100%;
    transition: height 0.5s ease-out;
    position: relative;
  }

  .bar-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-tertiary);
    text-align: center;
  }

  /* Matrix Grid */
  .matrix-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .matrix-quadrant {
    padding: 20px;
    background: var(--color-surface-1);
    border: 2px solid;
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .matrix-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 12px;
  }

  .matrix-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    margin-bottom: 8px;
  }

  .matrix-sublabel {
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Insights */
  .insights-card {
    padding: 20px;
  }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .insight-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .insight-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    font-size: 18px;
    flex-shrink: 0;
  }

  .insight-icon.success {
    background: rgba(16, 185, 129, 0.15);
  }

  .insight-icon.info {
    background: rgba(59, 130, 246, 0.15);
  }

  .insight-icon.warning {
    background: rgba(245, 158, 11, 0.15);
  }

  .insight-icon.neutral {
    background: var(--color-surface-2);
  }

  .insight-content {
    flex: 1;
  }

  .insight-text {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .insight-text strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .insight-bar {
    height: 4px;
    background: var(--color-surface-2);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .insight-bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease-out;
  }

  .insight-bar-fill.success {
    background: var(--color-success);
  }

  .insight-bar-fill.info {
    background: var(--color-info);
  }

  .insight-bar-fill.warning {
    background: var(--color-warning);
  }
</style>
