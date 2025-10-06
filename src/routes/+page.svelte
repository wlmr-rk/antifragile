<script lang="ts">
  import {
    Activity,
    Calendar,
    Dumbbell,
    Flame,
    Target,
    TrendingUp,
    Zap,
  } from "@lucide/svelte";
  import { useQuery } from "convex-svelte";
  import { api } from "../convex/_generated/api";

  // Fetch data from all modules
  const todos = useQuery(api.todos.getTodos, { includeCompleted: false });
  const allTodos = useQuery(api.todos.getTodos, { includeCompleted: true });
  const dailySummary = useQuery(api.todos.getDailyTasksSummary, {});
  const habitsSummary = useQuery(api.habits.getHabitsSummary, {});
  const runStats = useQuery(api.runs.getRunStats, {});
  const workoutStats = useQuery(api.workouts.getWorkoutStats, {});
  const matrixSummary = useQuery(api.eisenhower.getMatrixSummary, {});

  // Animated score counter
  let displayScore = $state(0);
  let isScoreLoaded = $state(false);

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
    if (!allTodos.data) return 0;
    const completed = allTodos.data.filter((t) => t.isCompleted).length;
    const total = allTodos.data.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  // Calculate active todos count
  const activeTodosCount = $derived(() => {
    if (!todos.data) return 0;
    return todos.data.length;
  });

  const completedTodosCount = $derived(() => {
    if (!allTodos.data) return 0;
    return allTodos.data.filter((t) => t.isCompleted).length;
  });

  // Weekly activity data - last 7 days (only today has real data)
  let weeklyActivity = $derived.by(() => {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const today = new Date();
    
    // Get actual counts for today only
    const totalTodos = (activeTodosCount() || 0) + (completedTodosCount() || 0);
    const totalHabits = habitsSummary.data?.totalCompleted ?? 0;
    const totalFitness = (workoutStats.data?.thisWeek ?? 0) + (runStats.data?.thisWeek ?? 0);
    
    // Create last 7 days of activity
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i)); // Start from 6 days ago
      const dayOfWeek = date.getDay();
      const isToday = i === 6;
      
      return {
        day: days[dayOfWeek],
        date: date.getDate(),
        month: date.getMonth() + 1,
        isToday,
        // Only today has real data, past days are 0
        todos: isToday ? totalTodos : 0,
        habits: isToday ? totalHabits : 0,
        workouts: isToday ? totalFitness : 0,
      };
    });
  });

  let maxActivity = $derived.by(() => {
    if (!weeklyActivity || weeklyActivity.length === 0) return 10;
    const totals = weeklyActivity.map((d) => d.todos + d.habits + d.workouts);
    const max = Math.max(...totals, 1);
    return max > 0 ? max : 10;
  });

  // Activity detail popup state
  let selectedDay: any = $state(null);
  
  function showDayDetail(day: any) {
    selectedDay = day;
  }
  
  function closeDayDetail() {
    selectedDay = null;
  }

  // Auto-scroll to today on mount
  $effect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const scrollContainer = document.getElementById('activity-scroll');
        if (scrollContainer) {
          // Scroll to show today on the right (last item)
          scrollContainer.scrollLeft = scrollContainer.scrollWidth;
        }
      }, 100);
    }
  });

  // Animate score counter - count 0-30 in first second, then snap to real value
  let animationInterval: ReturnType<typeof setInterval> | null = null;
  
  $effect(() => {
    const targetScore = productivityScore();
    
    if (!isScoreLoaded) {
      isScoreLoaded = true;
      
      // Count from 0 to 30 over 1 second
      const duration = 1000;
      const maxLoadingScore = 30;
      const steps = 30;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      animationInterval = setInterval(() => {
        currentStep++;
        displayScore = currentStep;
        
        if (currentStep >= maxLoadingScore) {
          if (animationInterval) clearInterval(animationInterval);
          animationInterval = null;
        }
      }, stepDuration);
      
      return () => {
        if (animationInterval) clearInterval(animationInterval);
      };
    }
    
    // When data loads, smoothly transition to real value
    if (targetScore > 0 && displayScore !== targetScore) {
      // Clear any existing animation
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      
      const startScore = displayScore;
      const diff = targetScore - startScore;
      const duration = 600;
      const steps = 30;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      animationInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        displayScore = Math.round(startScore + (diff * eased));
        
        if (currentStep >= steps) {
          displayScore = targetScore;
          if (animationInterval) clearInterval(animationInterval);
          animationInterval = null;
        }
      }, stepDuration);
    }
  });
</script>

<div class="page">
  <div class="content">
    <!-- Hero Score - Asymmetric Design -->
    <div class="hero-score">
      <div class="hero-main">
        <div class="score-mega">
          <div
            class="score-number"
            style="color: {getScoreColor(displayScore)};"
          >
            {displayScore}
          </div>
          <div class="score-label">Score</div>
        </div>
        <div class="score-visual">
          <svg viewBox="0 0 100 100" class="score-arc">
            <path
              d="M 10 90 Q 10 10, 90 10"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              stroke-width="2"
            />
            <path
              d="M 10 90 Q 10 10, 90 10"
              fill="none"
              stroke={getScoreColor(displayScore)}
              stroke-width="2"
              stroke-dasharray="{(displayScore / 100) * 120} 120"
              stroke-linecap="round"
              class="score-arc-fill"
            />
          </svg>
          <div class="score-status-badge">
            {#if displayScore >= 80}
              <Flame size={14} strokeWidth={2.5} />
            {:else if displayScore >= 60}
              <TrendingUp size={14} strokeWidth={2.5} />
            {:else if displayScore >= 40}
              <Target size={14} strokeWidth={2.5} />
            {:else}
              <Zap size={14} strokeWidth={2.5} />
            {/if}
          </div>
        </div>
      </div>

      <!-- Metrics Grid - Staggered -->
      <div class="metrics-grid">
        <a href="/todos" class="metric-pill" style="--delay: 0s;">
          <div class="metric-value">
            {completedTodosCount()}<span class="metric-total"
              >/{activeTodosCount() + completedTodosCount()}</span
            >
          </div>
          <div class="metric-label">Tasks</div>
          <div
            class="metric-bar"
            style="width: {completionRate()}%; background: var(--color-accent);"
          ></div>
        </a>
        <a href="/habits" class="metric-pill" style="--delay: 0.1s;">
          <div class="metric-value">
            {habitsSummary.data?.totalCompleted ?? 0}<span class="metric-total"
              >/{habitsSummary.data?.totalTarget ?? 0}</span
            >
          </div>
          <div class="metric-label">Habits</div>
          <div
            class="metric-bar"
            style="width: {habitsSummary.data?.percentage ??
              0}%; background: var(--color-success);"
          ></div>
        </a>
        <a href="/fitness" class="metric-pill" style="--delay: 0.2s;">
          <div class="metric-value">{workoutStats.data?.thisWeek ?? 0}</div>
          <div class="metric-label">Workouts</div>
        </a>
        <a href="/fitness" class="metric-pill" style="--delay: 0.3s;">
          <div class="metric-value">{runStats.data?.thisWeek ?? 0}</div>
          <div class="metric-label">Runs</div>
        </a>
      </div>
    </div>

    <!-- Activity Visualization - Scrollable 3-day view -->
    <div class="activity-section">
      <div class="section-label">
        <Calendar size={14} strokeWidth={2.5} />
        <span>Activity</span>
      </div>
      <div class="activity-scroll" id="activity-scroll">
        {#each weeklyActivity as day}
          {@const total = day.todos + day.habits + day.workouts}
          {@const barHeightPx = total > 0 ? Math.max((total / maxActivity) * 100, 20) : 12}
          {@const todoPx = total > 0 ? (day.todos / total) * barHeightPx : 0}
          {@const habitPx = total > 0 ? (day.habits / total) * barHeightPx : 0}
          {@const workoutPx = total > 0 ? (day.workouts / total) * barHeightPx : 0}
          <button 
            class="day-card" 
            class:today={day.isToday}
            class:empty={total === 0}
            onclick={() => showDayDetail(day)}
          >
            <div class="day-header">
              <div class="day-date">{day.month}/{day.date}</div>
              <div class="day-name">{day.day}</div>
            </div>
            <div class="bar-wrapper">
              {#if total > 0}
                <div class="bar-container" style="height: {barHeightPx}px;">
                  {#if day.todos > 0}
                    <div class="bar-fill todos" style="height: {todoPx}px;"></div>
                  {/if}
                  {#if day.habits > 0}
                    <div class="bar-fill habits" style="height: {habitPx}px;"></div>
                  {/if}
                  {#if day.workouts > 0}
                    <div class="bar-fill workouts" style="height: {workoutPx}px;"></div>
                  {/if}
                </div>
              {:else}
                <div class="empty-bar"></div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Activity Detail Popup -->
    {#if selectedDay}
      <div class="popup-overlay" onclick={closeDayDetail}>
        <div class="popup-content" onclick={(e) => e.stopPropagation()}>
          <div class="popup-header">
            <div>
              <div class="popup-title">{selectedDay.month}/{selectedDay.date}</div>
              <div class="popup-subtitle">{selectedDay.day}曜日</div>
            </div>
            <button class="popup-close" onclick={closeDayDetail}>×</button>
          </div>
          <div class="popup-body">
            <div class="detail-row">
              <div class="detail-icon todos-bg">
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <div class="detail-info">
                <div class="detail-label">Tasks</div>
                <div class="detail-value">{selectedDay.todos}</div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-icon habits-bg">
                <Target size={16} strokeWidth={2.5} />
              </div>
              <div class="detail-info">
                <div class="detail-label">Habits</div>
                <div class="detail-value">{selectedDay.habits}</div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-icon workouts-bg">
                <Dumbbell size={16} strokeWidth={2.5} />
              </div>
              <div class="detail-info">
                <div class="detail-label">Fitness</div>
                <div class="detail-value">{selectedDay.workouts}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Focus & Insights - Split Layout -->
    <div class="split-section">
      {#if matrixSummary.data}
        {@const total = matrixSummary.data.urgentImportant.total + 
                        matrixSummary.data.notUrgentImportant.total + 
                        matrixSummary.data.urgentNotImportant.total + 
                        matrixSummary.data.notUrgentNotImportant.total}
        {@const radius = 40}
        {@const circumference = 2 * Math.PI * radius}
        {@const urgent = (matrixSummary.data.urgentImportant.total / (total || 1)) * circumference}
        {@const important = (matrixSummary.data.notUrgentImportant.total / (total || 1)) * circumference}
        {@const delegate = (matrixSummary.data.urgentNotImportant.total / (total || 1)) * circumference}
        {@const eliminate = (matrixSummary.data.notUrgentNotImportant.total / (total || 1)) * circumference}
        
        <a href="/focus" class="focus-panel">
          <div class="section-label">
            <Target size={14} strokeWidth={2.5} />
            <span>Focus</span>
          </div>
          <div class="mini-matrix">
            <div class="mini-quadrant urgent-important">
              <div class="mini-count">{matrixSummary.data.urgentImportant.total}</div>
              <div class="mini-label">Do</div>
            </div>
            <div class="mini-quadrant not-urgent-important">
              <div class="mini-count">{matrixSummary.data.notUrgentImportant.total}</div>
              <div class="mini-label">Plan</div>
            </div>
            <div class="mini-quadrant urgent-not-important">
              <div class="mini-count">{matrixSummary.data.urgentNotImportant.total}</div>
              <div class="mini-label">Delegate</div>
            </div>
            <div class="mini-quadrant not-urgent-not-important">
              <div class="mini-count">{matrixSummary.data.notUrgentNotImportant.total}</div>
              <div class="mini-label">Delete</div>
            </div>
          </div>
        </a>
      {:else}
        <a href="/focus" class="focus-panel">
          <div class="section-label">
            <Target size={14} strokeWidth={2.5} />
            <span>Focus</span>
          </div>
          <div class="mini-matrix">
            <div class="mini-quadrant skeleton-quad"></div>
            <div class="mini-quadrant skeleton-quad"></div>
            <div class="mini-quadrant skeleton-quad"></div>
            <div class="mini-quadrant skeleton-quad"></div>
          </div>
        </a>
      {/if}

      <div class="insights-panel">
        <div class="section-label">
          <TrendingUp size={14} strokeWidth={2.5} />
          <span>Insights</span>
        </div>
        <div class="insights-stack">
          {#if !workoutStats.data && !habitsSummary.data && !runStats.data}
            <div class="skeleton-insight"></div>
            <div class="skeleton-insight"></div>
            <div class="skeleton-insight"></div>
          {:else if workoutStats.data && workoutStats.data.thisWeek > 0 && completionRate() > 70}
            <div class="insight-line">
              <Dumbbell
                size={12}
                strokeWidth={2.5}
                style="color: var(--color-success);"
              />
              <div class="insight-text">
                <span class="insight-title">Workout boost</span>
                <span class="insight-detail">{workoutStats.data.thisWeek} sessions → {completionRate()}% completion</span>
              </div>
            </div>
          {/if}
          {#if habitsSummary.data && habitsSummary.data.percentage > 80}
            <div class="insight-line">
              <Flame
                size={12}
                strokeWidth={2.5}
                style="color: var(--color-success);"
              />
              <div class="insight-text">
                <span class="insight-title">Strong streak</span>
                <span class="insight-detail">{habitsSummary.data.percentage}% habit consistency</span>
              </div>
            </div>
          {/if}
          {#if runStats.data && runStats.data.thisWeek >= 3}
            <div class="insight-line">
              <Activity
                size={12}
                strokeWidth={2.5}
                style="color: var(--color-info);"
              />
              <div class="insight-text">
                <span class="insight-title">Running rhythm</span>
                <span class="insight-detail">{runStats.data.thisWeek} runs this week</span>
              </div>
            </div>
          {/if}
          {#if activeTodosCount() > 5}
            <div class="insight-line">
              <Zap
                size={12}
                strokeWidth={2.5}
                style="color: var(--color-warning);"
              />
              <div class="insight-text">
                <span class="insight-title">Focus needed</span>
                <span class="insight-detail">{activeTodosCount()} active tasks</span>
              </div>
            </div>
          {/if}
          {#if (!habitsSummary.data || habitsSummary.data.totalHabits === 0)}
            <div class="insight-line">
              <Target
                size={12}
                strokeWidth={2.5}
                style="color: var(--color-text-tertiary);"
              />
              <div class="insight-text">
                <span class="insight-title">Build habits</span>
                <span class="insight-detail">Start tracking daily routines</span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    background: var(--color-bg-primary);
    position: relative;
  }

  .page::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40vh;
    background: radial-gradient(
      ellipse at top,
      rgba(139, 92, 246, 0.08) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
    animation: ambientPulse 8s ease-in-out infinite;
  }

  @keyframes ambientPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .content {
    padding: 20px 16px 16px 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: auto;
    gap: 12px;
    position: relative;
    z-index: 1;
    min-height: 0;
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

  /* Hero Score - Bento Grid: Full Width */
  .hero-score {
    grid-column: 1 / -1;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.8),
      0 8px 24px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .hero-score::before {
    content: "";
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(139, 92, 246, 0.1) 0%,
      transparent 70%
    );
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }

  .score-mega {
    flex: 1;
  }

  .score-number {
    font-size: 72px;
    font-weight: 800;
    line-height: 0.9;
    letter-spacing: -0.04em;
    margin-bottom: 4px;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .score-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .score-visual {
    position: relative;
    width: 100px;
    height: 100px;
  }

  .score-arc {
    width: 100%;
    height: 100%;
  }

  .score-arc-fill {
    transition: stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .score-status-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    animation: pulse 3s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }

  /* Metrics Grid - Staggered Pills */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .metric-pill {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
    animation: slideUp 0.5s ease-out backwards;
    animation-delay: var(--delay);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    transition: all 0.2s ease;
    text-decoration: none;
    display: block;
  }

  .metric-pill:active {
    transform: scale(0.98);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .metric-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    margin-bottom: 6px;
  }

  .metric-total {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 12px currentColor, 0 0 4px currentColor;
    opacity: 0.9;
  }

  /* Section Label - Consistent Style */
  .section-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 14px;
  }

  /* Activity Section - Bento Grid: Full Width */
  .activity-section {
    grid-column: 1 / -1;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 20px;
    padding: 18px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }

  .activity-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 4px;
    scroll-behavior: smooth;
    flex: 1;
    min-height: 140px;
  }

  .activity-scroll::-webkit-scrollbar {
    display: none;
  }

  .day-card {
    flex: 0 0 calc(33.333% - 7px);
    min-width: 90px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-snap-align: start;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
    text-align: left;
  }

  .day-card:active {
    transform: scale(0.98);
  }

  .day-card.today {
    background: rgba(167, 139, 250, 0.08);
    border-color: rgba(167, 139, 250, 0.3);
    box-shadow: 0 0 20px rgba(167, 139, 250, 0.15);
  }

  .day-card.empty {
    opacity: 0.4;
  }

  .day-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .day-date {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .day-name {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .bar-wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
    min-height: 60px;
  }

  .bar-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .empty-bar {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .bar-fill {
    width: 100%;
  }

  .bar-fill.todos {
    background: linear-gradient(180deg, var(--color-accent), rgba(167, 139, 250, 0.7));
    box-shadow: 0 0 12px rgba(167, 139, 250, 0.3);
  }

  .bar-fill.habits {
    background: linear-gradient(180deg, var(--color-success), rgba(52, 211, 153, 0.7));
    box-shadow: 0 0 12px rgba(52, 211, 153, 0.3);
  }

  .bar-fill.workouts {
    background: linear-gradient(180deg, var(--color-cyan), rgba(34, 211, 238, 0.7));
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
  }

  /* Activity Detail Popup */
  .popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  .popup-content {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    width: 100%;
    max-width: 320px;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.9),
      0 8px 24px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .popup-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .popup-subtitle {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin-top: 2px;
  }

  .popup-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text-secondary);
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .popup-close:active {
    transform: scale(0.95);
  }

  .popup-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
  }

  .detail-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-icon.todos-bg {
    background: rgba(139, 92, 246, 0.15);
    color: var(--color-accent);
  }

  .detail-icon.habits-bg {
    background: rgba(16, 185, 129, 0.15);
    color: var(--color-success);
  }

  .detail-icon.workouts-bg {
    background: rgba(34, 211, 238, 0.15);
    color: var(--color-cyan);
  }

  .detail-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .detail-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  /* Split Section - Bento Grid: Already in 2-column grid */
  .split-section {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  /* Focus Panel */
  .focus-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 18px;
    padding: 14px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
    min-height: 200px;
  }

  .focus-panel:active {
    transform: scale(0.98);
  }

  /* Mini Eisenhower Matrix */
  .mini-matrix {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 8px;
  }

  .mini-quadrant {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  .mini-quadrant.urgent-important {
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(248, 113, 113, 0.05);
  }

  .mini-quadrant.not-urgent-important {
    border-color: rgba(96, 165, 250, 0.3);
    background: rgba(96, 165, 250, 0.05);
  }

  .mini-quadrant.urgent-not-important {
    border-color: rgba(251, 191, 36, 0.3);
    background: rgba(251, 191, 36, 0.05);
  }

  .mini-quadrant.not-urgent-not-important {
    border-color: rgba(156, 163, 175, 0.2);
    background: rgba(156, 163, 175, 0.03);
  }

  .mini-count {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .mini-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .skeleton-quad {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-quad:nth-child(2) {
    animation-delay: 0.1s;
  }

  .skeleton-quad:nth-child(3) {
    animation-delay: 0.2s;
  }

  .skeleton-quad:nth-child(4) {
    animation-delay: 0.3s;
  }

  /* Skeleton Loaders */
  .skeleton-donut {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .skeleton-bar {
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-bar:nth-child(1) {
    width: 100%;
  }

  .skeleton-bar:nth-child(2) {
    width: 85%;
  }

  .skeleton-bar:nth-child(3) {
    width: 70%;
  }

  .skeleton-bar:nth-child(4) {
    width: 90%;
  }

  .skeleton-insight {
    height: 48px;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-insight:nth-child(2) {
    animation-delay: 0.2s;
  }

  .skeleton-insight:nth-child(3) {
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



  /* Insights Panel */
  .insights-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 18px;
    padding: 14px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .insights-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 120px;
  }

  .insight-line {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .insight-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .insight-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .insight-detail {
    font-size: 10px;
    font-weight: 500;
    color: var(--color-text-tertiary);
  }
</style>
