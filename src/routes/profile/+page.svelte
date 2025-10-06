<script lang="ts">
  import { BarChart3, Calendar, Download, Settings, Target, User } from "@lucide/svelte";
</script>

<div class="page">
  <!-- Coming Soon Message -->
  <div class="empty-state">
    <div class="empty-icon">
      <User size={80} strokeWidth={1.5} style="color: var(--color-accent);" />
    </div>
    <h3 class="empty-title">Profile & Settings Coming Soon</h3>
    <p class="empty-subtitle">
      Manage your preferences and view<br />
      your productivity statistics
    </p>
    <div class="features-preview">
      <div class="feature-item">
        <Settings size={16} />
        App Settings & Preferences
      </div>
      <div class="feature-item">
        <BarChart3 size={16} />
        Overall Statistics Dashboard
      </div>
      <div class="feature-item">
        <Download size={16} />
        Data Export & Backup
      </div>
      <div class="feature-item">
        <Calendar size={16} />
        Weekly/Monthly Reports
      </div>
      <div class="feature-item">
        <Target size={16} />
        Goals & Achievements
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--color-bg-primary);
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
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
    margin-bottom: 32px;
  }

  .features-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 300px;
    margin: 0 auto;
  }

  .feature-item {
    font-size: 14px;
    color: var(--color-text-secondary);
    text-align: left;
    padding: 12px 16px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 10px;
  }
</style>
