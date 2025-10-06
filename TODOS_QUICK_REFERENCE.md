# Todos Page - Quick Reference Card

## 🎨 Color Variables
```css
--color-accent:        #a78bfa  /* Purple - Primary */
--color-accent-light:  #c4b5fd  /* Light Purple */
--color-success:       #34d399  /* Green - Completed */
--color-warning:       #fbbf24  /* Yellow - Medium */
--color-error:         #f87171  /* Red - High/Overdue */
--color-info:          #60a5fa  /* Blue - Low */
--color-cyan:          #22d3ee  /* Cyan - Syncing */
```

## 📐 Spacing Scale
```
4px   - Micro gaps (icon spacing)
6px   - Tag gaps
8px   - Card gaps, filter gaps
10px  - Button padding (vertical)
12px  - Section gaps
14px  - Card padding (vertical)
16px  - Page padding, card padding (horizontal)
18px  - Button padding (horizontal)
20px  - Modal padding, stat card padding
24px  - Modal header padding
```

## 🔤 Typography
```
32px / 800 / -0.02em  - Hero numbers
20px / 700 / -0.02em  - Modal titles
14px / 600 / -0.01em  - Card titles
13px / 500 / normal   - Subtask text
12px / 700 / 0.02em   - Filter labels
11px / 700 / 0.05em   - Tag text
10px / 700 / 0.08em   - Stat labels (uppercase)
```

## 🎭 Component Sizes
```
Checkbox:        24px × 24px (20px for subtasks)
Delete button:   32px × 32px
Filter pill:     auto × 36px
Stat card:       auto × 80px
Tag:             auto × 20px
Action button:   28px × 28px
Modal close:     40px × 40px
```

## 💫 Animation Timings
```
Fast:     0.2s cubic-bezier(0.4, 0, 0.2, 1)
Medium:   0.3s cubic-bezier(0.4, 0, 0.2, 1)
Slow:     0.4s cubic-bezier(0.4, 0, 0.2, 1)
Pulse:    2s ease-in-out infinite
Rotate:   10s linear infinite
Ambient:  8s ease-in-out infinite
```

## 🌟 Shadow Presets
```css
/* Level 1 - Filter Pills */
box-shadow:
  0 4px 12px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.03);

/* Level 2 - Todo Cards */
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.5),
  0 2px 8px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);

/* Level 3 - Modals */
box-shadow:
  0 -20px 60px rgba(0, 0, 0, 0.9),
  0 -8px 24px rgba(0, 0, 0, 0.7),
  inset 0 1px 0 rgba(255, 255, 255, 0.08);
```

## 🎨 Gradient Patterns
```css
/* Card Background */
background: linear-gradient(135deg, 
  rgba(255, 255, 255, 0.05) 0%, 
  rgba(255, 255, 255, 0.02) 100%
);

/* Stat Card - Active */
background: linear-gradient(135deg, 
  rgba(167, 139, 250, 0.12) 0%, 
  rgba(167, 139, 250, 0.04) 100%
);

/* Ambient Background */
background: radial-gradient(ellipse at top,
  rgba(139, 92, 246, 0.08) 0%,
  transparent 70%
);
```

## 🔥 Glow Effects
```css
/* Neon Glow (Active) */
box-shadow: 0 0 20px rgba(167, 139, 250, 0.4);

/* Priority Glow (High) */
box-shadow: -4px 0 16px rgba(248, 113, 113, 0.15);

/* Text Glow */
text-shadow: 0 0 20px rgba(167, 139, 250, 0.5);

/* Tag Glow */
box-shadow: 0 0 8px var(--tag-color);
```

## 🎯 Border Styles
```css
/* Standard */
border: 1px solid rgba(255, 255, 255, 0.08);

/* Priority Left Border */
border-left: 3px solid var(--priority-color);

/* Subtask Left Border */
border-left: 2px solid rgba(167, 139, 250, 0.3);

/* Active Filter */
border: 1px solid rgba(167, 139, 250, 0.4);
```

## 📱 Responsive Breakpoints
```css
/* Mobile First - Default */
/* No breakpoint needed */

/* Tablet - 768px+ */
@media (min-width: 768px) {
  /* Wider layouts */
}

/* Desktop - 1024px+ */
@media (min-width: 1024px) {
  /* Multi-column layouts */
}
```

## 🎬 Key Animations
```css
/* Slide In */
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Rotate */
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Ambient Pulse */
@keyframes ambientPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 🎨 State Classes
```css
.completed     { opacity: 0.5; }
.overdue       { /* Red glow + pulse */ }
.optimistic    { opacity: 0.6; }
.active        { /* Neon glow */ }
.checked       { /* Green fill */ }
.partial       { /* Yellow fill */ }
```

## 🔧 Common Patterns

### Card with Priority Glow
```svelte
<div class="todo-item" style="border-left-color: {priorityColor};">
  <!-- Content -->
</div>
```

### Circular Checkbox
```svelte
<div class="check-box {isCompleted ? 'checked' : ''}">
  {#if isCompleted}
    <CheckCircle size={20} strokeWidth={2.5} />
  {/if}
</div>
```

### Tag with Icon
```svelte
<span class="tag tag-daily">
  <Repeat size={11} strokeWidth={2.5} />
  Daily
</span>
```

### Stat Card
```svelte
<div class="stat-card stat-primary">
  <div class="stat-value">{count}</div>
  <div class="stat-label">Label</div>
  <div class="stat-glow"></div>
</div>
```

## 🎯 Z-Index Layers
```
0    - Background gradient
1    - Page content
10   - Sticky filter bar
100  - Floating action button
1000 - Modals and overlays
```

## 🌈 Opacity Scale
```
0.02 - Subtle backgrounds
0.04 - Card backgrounds
0.05 - Inset highlights
0.06 - Tag backgrounds
0.08 - Active backgrounds
0.1  - Hover states
0.12 - Strong backgrounds
0.5  - Completed items
0.6  - Optimistic items
```

## 🎨 Border Radius Scale
```
6px  - Tags
8px  - Buttons, small elements
10px - Subtasks
12px - Filter pills, cards
14px - Todo cards
18px - Stat cards
20px - Sections
24px - Modals
50%  - Circular elements
```

## 📏 Line Height Scale
```
0.9  - Hero numbers (tight)
1.0  - Stat values
1.4  - Card titles, subtasks
1.5  - Body text
1.6  - Modal text
```

## 🎯 Font Weight Scale
```
500 - Subtask text
600 - Card titles, labels
700 - Filter labels, tags, buttons
800 - Hero numbers, counts
```

## 🔥 Quick Copy-Paste

### Multi-Layer Shadow
```css
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.5),
  0 2px 8px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);
```

### Glassmorphic Background
```css
background: linear-gradient(135deg, 
  rgba(255, 255, 255, 0.05) 0%, 
  rgba(255, 255, 255, 0.02) 100%
);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```

### Smooth Transition
```css
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### Active State Glow
```css
background: rgba(167, 139, 250, 0.15);
border-color: rgba(167, 139, 250, 0.4);
box-shadow: 0 0 20px rgba(167, 139, 250, 0.2);
```

---

**Pro Tip**: Keep this reference open while coding. Consistency is key to the premium feel!
