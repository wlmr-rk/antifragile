# Antifragile Design System
## Cyberpunk Minimalist Aesthetic - 2026

### Design Philosophy
- **Pure Black Base**: #000000 background for maximum contrast
- **Neon Accents**: Electric colors with subtle glows
- **Glassmorphism**: Layered transparency with blur effects
- **Pronounced Depth**: Multiple shadow layers for 3D feel
- **Minimal & Elegant**: Clean, purposeful design

---

## Color Palette

### Primary Colors
```css
--color-accent: #a78bfa        /* Electric Purple */
--color-success: #34d399       /* Neon Mint */
--color-warning: #fbbf24       /* Electric Gold */
--color-error: #f87171         /* Neon Red */
--color-info: #60a5fa          /* Electric Blue */
--color-cyan: #22d3ee          /* Neon Cyan */
```

### Text Hierarchy
```css
--color-text-primary: #ffffff
--color-text-secondary: #a0a0a0
--color-text-tertiary: #707070
--color-text-muted: #505050
```

### Glassmorphic Surfaces
```css
--glass-surface-1: rgba(255, 255, 255, 0.03)
--glass-surface-2: rgba(255, 255, 255, 0.05)
--glass-surface-3: rgba(255, 255, 255, 0.08)
```

---

## Components

### Button
**Variants**: primary, secondary, ghost, danger
**Sizes**: sm, md, lg

```svelte
<Button variant="primary" size="md">Click Me</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="danger">Delete</Button>
```

### Card
**Variants**: default, elevated, interactive

```svelte
<Card variant="elevated">
  Content here
</Card>

<Card variant="interactive" onclick={handleClick}>
  Clickable card
</Card>
```

### Checkbox
**Props**: checked, color, glowColor

```svelte
<Checkbox 
  checked={isChecked}
  color="var(--color-accent)"
  glowColor="rgba(167, 139, 250, 0.4)"
  onclick={toggle}
/>
```

### Input & Textarea
**Features**: Neon glow on focus, glassmorphic background

```svelte
<Input 
  bind:value={text}
  placeholder="Enter text..."
/>

<Textarea 
  bind:value={notes}
  rows={3}
/>
```

### SectionLabel
**Usage**: Consistent section headers with icons

```svelte
<SectionLabel icon={Calendar}>
  Activity
</SectionLabel>
```

---

## Shadows & Depth

### Shadow Layers
```css
--shadow-sm: 0 2px 8px 0 rgba(0, 0, 0, 0.9)
--shadow-md: 0 4px 16px 0 rgba(0, 0, 0, 0.95)
--shadow-lg: 0 8px 24px 0 rgba(0, 0, 0, 1)
--shadow-xl: 0 16px 32px 0 rgba(0, 0, 0, 1)
```

### Neon Glows
```css
--glow-accent: 0 0 24px rgba(167, 139, 250, 0.4), 0 0 8px rgba(167, 139, 250, 0.2)
--glow-success: 0 0 24px rgba(52, 211, 153, 0.4), 0 0 8px rgba(52, 211, 153, 0.2)
--glow-error: 0 0 24px rgba(248, 113, 113, 0.4), 0 0 8px rgba(248, 113, 113, 0.2)
```

---

## Typography

### Font Weights
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Sizes
- xs: 12px
- sm: 14px
- base: 15px
- lg: 17px
- xl: 20px

---

## Spacing & Layout

### Border Radius
```css
--radius-xs: 6px
--radius-sm: 10px
--radius-md: 14px
--radius-lg: 18px
--radius-xl: 24px
```

### Transitions
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Usage Guidelines

### DO ✓
- Use neon glows sparingly for emphasis
- Layer shadows for depth
- Maintain consistent spacing
- Use glassmorphic backgrounds
- Keep animations smooth and purposeful

### DON'T ✗
- Overuse bright colors
- Mix different design patterns
- Use flat shadows
- Ignore accessibility
- Create jarring animations

---

## Accessibility

- Minimum touch target: 44px
- Focus states with neon glow
- Proper ARIA labels
- Keyboard navigation support
- Reduced motion support

---

## Implementation

All components are located in `src/lib/components/ui/`

Import components:
```typescript
import { Button, Card, Checkbox, Input, Textarea, SectionLabel } from '$lib/components/ui';
```

Use CSS variables from `src/app.css` for consistent styling.
