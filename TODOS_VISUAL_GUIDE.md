# Todos Page - Visual Design Guide

## 🎨 Color Palette

### Priority Colors
```
High Priority:    #f87171 (Red)    - Urgent, demands attention
Medium Priority:  #fbbf24 (Yellow) - Important, needs planning
Low Priority:     #60a5fa (Blue)   - Nice to have, flexible
```

### Status Colors
```
Active:    #a78bfa (Purple) - Primary accent
Completed: #34d399 (Green)  - Success state
Overdue:   #f87171 (Red)    - Alert state
Daily:     #a78bfa (Purple) - Recurring tasks
Syncing:   #22d3ee (Cyan)   - Loading state
```

## 📐 Layout Structure

```
┌─────────────────────────────────────┐
│  Hero Stats (Grid)                  │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 12   │ │  8   │ │  2   │        │
│  │Active│ │ Done │ │Overdue│       │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  Filter Bar (Sticky)                │
│  [All 20] [Active 12] [Daily] [Done]│
├─────────────────────────────────────┤
│  Todo List (Scrollable)             │
│  ┌─────────────────────────────────┐│
│  │ ● High Priority Task            ││
│  │   [high] [Today] [2/3]          ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ○ Normal Task                   ││
│  │   [Daily] [Tomorrow]            ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ◐ Partial Complete Task         ││
│  │   [medium] [1/2]                ││
│  │   ├─ ✓ Subtask 1                ││
│  │   └─ ○ Subtask 2                ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 🎯 Component Anatomy

### Todo Card
```
┌─────────────────────────────────────────────┐
│ [●] Task Title                    [⋮] [×]   │ ← Main row
│     [priority] [daily] [date] [2/3]         │ ← Tags row
└─────────────────────────────────────────────┘
 │   │                              │   │
 │   └─ Text content                │   └─ Delete
 └─ Checkbox                        └─ Actions
```

### Stat Card
```
┌──────────────┐
│     12       │ ← Large number (32px)
│   Active     │ ← Label (10px uppercase)
│   [glow]     │ ← Animated glow effect
└──────────────┘
```

### Filter Pill
```
┌─────────────┐
│ [20] All    │ ← Count badge + label
└─────────────┘
     │
     └─ Neon glow when active
```

## 🎭 Visual States

### Checkbox States
```
○  Unchecked    - Border only, transparent
●  Checked      - Green fill, checkmark icon
◐  Partial      - Yellow fill, minus icon
```

### Card States
```
Normal:    White border, subtle shadow
High:      Red left border + red glow
Medium:    Yellow left border + yellow glow
Low:       Blue left border + blue glow
Overdue:   Red border + pulsing red glow
Completed: Reduced opacity (0.5)
```

### Tag Styles
```
[high]     - Red background, red border, red glow
[medium]   - Yellow background, yellow border, yellow glow
[low]      - Blue background, blue border, blue glow
[Daily]    - Purple background, repeat icon
[Today]    - Blue background, calendar icon
[Overdue]  - Red background, pulsing animation
[2/3]      - Progress indicator, color-coded
```

## 📏 Spacing System

```
Hero Stats:
  - Padding: 16px
  - Gap: 12px
  - Card padding: 20px 16px

Filter Bar:
  - Padding: 16px
  - Gap: 8px
  - Pill padding: 10px 18px

Todo List:
  - Padding: 0 16px 100px 16px
  - Gap: 8px
  - Card padding: 14px 16px
  - Tag gap: 6px

Subtasks:
  - Indent: 40px + (level * 20px)
  - Gap: 6px
  - Padding: 10px 12px
```

## 🎬 Animation Timings

```
Fast:       0.2s - Buttons, hovers
Medium:     0.3s - Cards, modals
Slow:       0.4s - Hero stats entrance
Ambient:    8s  - Background pulse
Rotate:     10s - Stat card glow
```

## 🌟 Depth Layers (Z-Index)

```
0:  Background gradient
1:  Page content
10: Sticky filter bar
100: Floating action button
1000: Modals and overlays
```

## 💫 Glow Effects

### Neon Glow (Active States)
```css
box-shadow: 0 0 20px rgba(167, 139, 250, 0.4);
```

### Priority Glow (Left Border)
```css
box-shadow: -4px 0 16px rgba(248, 113, 113, 0.15);
```

### Text Glow (Large Numbers)
```css
text-shadow: 0 0 20px rgba(167, 139, 250, 0.5);
```

## 🎨 Gradient Patterns

### Card Backgrounds
```css
/* Normal */
linear-gradient(135deg, 
  rgba(255, 255, 255, 0.05) 0%, 
  rgba(255, 255, 255, 0.02) 100%
)

/* Stat Card - Active */
linear-gradient(135deg, 
  rgba(167, 139, 250, 0.12) 0%, 
  rgba(167, 139, 250, 0.04) 100%
)

/* Overdue */
linear-gradient(135deg, 
  rgba(248, 113, 113, 0.08) 0%, 
  rgba(255, 255, 255, 0.02) 100%
)
```

### Ambient Background
```css
radial-gradient(ellipse at top,
  rgba(139, 92, 246, 0.08) 0%,
  transparent 70%
)
```

## 🔤 Typography Scale

```
Hero Number:    32px, weight 800, -0.02em spacing
Card Title:     14px, weight 600, -0.01em spacing
Tag Text:       10px, weight 700, 0.05em spacing
Stat Label:     10px, weight 700, 0.08em spacing (uppercase)
Filter Label:   12px, weight 700, 0.02em spacing
Subtask Text:   13px, weight 500
```

## 🎯 Interactive Targets

```
Minimum touch target: 32px × 32px
Checkbox:            24px × 24px
Delete button:       32px × 32px
Filter pill:         Auto × 36px (with padding)
Stat card:           Full width × 80px
```

## 🌈 Accessibility Features

- High contrast ratios (WCAG AA compliant)
- Proper ARIA labels on all interactive elements
- Keyboard navigation support
- Reduced motion support via media query
- Touch-friendly hit targets (minimum 32px)
- Clear visual feedback on all interactions
- Screen reader friendly structure

## 🚀 Performance Notes

- CSS transforms for animations (GPU-accelerated)
- Backdrop-filter for glassmorphic effects
- Will-change hints on animated elements
- Optimistic UI updates for instant feedback
- Lazy loading of subtasks
- Debounced long press detection

## 📱 Responsive Behavior

- Stat cards: Auto-fit grid (minimum 100px)
- Filter bar: Horizontal scroll on overflow
- Todo cards: Full width with proper padding
- Modals: Bottom sheet style on mobile
- Safe area insets: Respected for notched devices

---

**Design Philosophy**: Every pixel serves a purpose. Every animation has meaning. Every color tells a story. This is not just a todo list—it's a productivity experience.
