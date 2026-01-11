# Recall Homepage Visual Specification

**Version:** 1.0
**Date:** January 10, 2026
**Concept:** "The Dissolving Memory"
**Status:** Build-Ready

---

## Design Concept

Text and code that dissolves into particles, then reconstructs when Recall is introduced. The hero demonstrates context fading away, then becoming permanent. This visual metaphor communicates the core problem (AI amnesia) and solution (persistent memory) without words.

---

## Part 1: Color System

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-void` | `#0A0A0B` | Page background, deepest layer |
| `--bg-elevated` | `#111113` | Card backgrounds, terminal body |
| `--bg-surface` | `#18181B` | Interactive surfaces, inputs |
| `--bg-hover` | `#1F1F23` | Hover states on surfaces |

### Text Hierarchy

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#FAFAF9` | Headlines, primary content (warm white) |
| `--text-secondary` | `#A1A1AA` | Body text, descriptions |
| `--text-muted` | `#71717A` | Timestamps, hints, tertiary info |
| `--text-ghost` | `#3F3F46` | Placeholder text, disabled states |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--amber` | `#F59E0B` | Preserved memory, success, active states |
| `--amber-glow` | `rgba(245, 158, 11, 0.15)` | Amber glow backgrounds |
| `--amber-bright` | `#FBBF24` | Hover state for amber elements |
| `--terminal-green` | `#22C55E` | Command prompts, success indicators |
| `--terminal-green-dim` | `#16A34A` | Secondary green elements |

### Decay Gradient (The Dissolve Effect)

| Stage | Hex | Purpose |
|-------|-----|---------|
| `--decay-0` | `#FAFAF9` | Full opacity text (preserved) |
| `--decay-1` | `#A1A1AA` | 70% decay |
| `--decay-2` | `#71717A` | 50% decay |
| `--decay-3` | `#52525B` | 30% decay |
| `--decay-4` | `#3F3F46` | 15% decay |
| `--decay-5` | `#27272A` | 5% decay (nearly gone) |
| `--decay-6` | `transparent` | Fully dissolved |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#1F1F23` | Default borders, dividers |
| `--border-visible` | `#27272A` | Visible borders, card outlines |
| `--border-focus` | `#F59E0B` | Focus rings, active states |
| `--border-glow` | `rgba(245, 158, 11, 0.3)` | Glowing border effect |

---

## Part 2: Typography

### Font Stack

```css
:root {
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-headline: 'JetBrains Mono', 'SF Mono', monospace;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-code: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
}
```

### Typography Scale

| Token | Size | Line Height | Letter Spacing | Weight | Font | Usage |
|-------|------|-------------|----------------|--------|------|-------|
| `--text-hero` | 72px | 1.0 | -0.03em | 700 | Space Grotesk | Hero headline only |
| `--text-hero-mobile` | 40px | 1.1 | -0.02em | 700 | Space Grotesk | Hero headline mobile |
| `--text-display` | 56px | 1.1 | -0.025em | 600 | JetBrains Mono | Section headlines |
| `--text-display-mobile` | 32px | 1.15 | -0.02em | 600 | JetBrains Mono | Section headlines mobile |
| `--text-h1` | 40px | 1.2 | -0.015em | 600 | Inter | Major section titles |
| `--text-h2` | 28px | 1.3 | -0.01em | 600 | Inter | Subsection titles |
| `--text-h3` | 20px | 1.4 | 0 | 600 | Inter | Card titles, labels |
| `--text-body-lg` | 20px | 1.6 | 0 | 400 | Inter | Lead paragraphs |
| `--text-body` | 16px | 1.625 | 0 | 400 | Inter | Body text |
| `--text-body-sm` | 14px | 1.5 | 0 | 400 | Inter | Small body text |
| `--text-code` | 14px | 1.7 | 0 | 400 | JetBrains Mono | Code blocks |
| `--text-code-sm` | 13px | 1.6 | 0 | 400 | JetBrains Mono | Inline code |
| `--text-caption` | 12px | 1.4 | 0.02em | 500 | Inter | Captions, badges |

### Loading Fonts

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

---

## Part 3: Spacing System

### Base Unit

All spacing derives from a 4px base unit.

### Spacing Scale

| Token | Value | Common Uses |
|-------|-------|-------------|
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-2` | 8px | Small gaps, inline spacing |
| `--space-3` | 12px | Default gap between related items |
| `--space-4` | 16px | Card padding, section gaps |
| `--space-5` | 20px | Medium component spacing |
| `--space-6` | 24px | Large component spacing |
| `--space-8` | 32px | Section internal padding |
| `--space-10` | 40px | Large section gaps |
| `--space-12` | 48px | Section separators |
| `--space-16` | 64px | Major section gaps |
| `--space-20` | 80px | Hero spacing |
| `--space-24` | 96px | Section padding (mobile) |
| `--space-32` | 128px | Section padding (desktop) |

### Section Padding

```css
.section {
  padding-top: var(--space-32);    /* 128px desktop */
  padding-bottom: var(--space-32);
  padding-left: var(--space-6);    /* 24px */
  padding-right: var(--space-6);
}

@media (max-width: 768px) {
  .section {
    padding-top: var(--space-24);  /* 96px mobile */
    padding-bottom: var(--space-24);
  }
}
```

### Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--container-sm` | 640px | Narrow content (forms, text) |
| `--container-md` | 768px | Medium content |
| `--container-lg` | 1024px | Standard content |
| `--container-xl` | 1280px | Wide content |
| `--container-2xl` | 1440px | Maximum width |

---

## Part 4: Terminal Component

The terminal is the centerpiece of the hero. It must feel like a real, premium terminal application.

### Window Dimensions

```css
.terminal {
  width: 100%;
  max-width: 900px;
  min-width: 320px;
  min-height: 420px;
  max-height: 520px;
}
```

### Window Chrome (Title Bar)

```css
.terminal-chrome {
  height: 44px;
  background: linear-gradient(180deg, #1A1A1D 0%, #141416 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
}
```

### Traffic Lights

```css
.traffic-lights {
  display: flex;
  gap: 8px;
}

.traffic-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
}

.traffic-light--close {
  background: #FF5F56;
  box-shadow:
    inset 0 -1px 1px rgba(0, 0, 0, 0.2),
    0 0 0 0.5px rgba(0, 0, 0, 0.3);
}

.traffic-light--minimize {
  background: #FFBD2E;
  box-shadow:
    inset 0 -1px 1px rgba(0, 0, 0, 0.2),
    0 0 0 0.5px rgba(0, 0, 0, 0.3);
}

.traffic-light--maximize {
  background: #27C93F;
  box-shadow:
    inset 0 -1px 1px rgba(0, 0, 0, 0.2),
    0 0 0 0.5px rgba(0, 0, 0, 0.3);
}
```

### Window Title

```css
.terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-code);
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}
```

### Terminal Body

```css
.terminal-body {
  background: linear-gradient(
    180deg,
    #0D0D0F 0%,
    #0A0A0C 50%,
    #080809 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-top: none;
  border-radius: 0 0 12px 12px;
  padding: 20px 24px;
  min-height: 376px;
  position: relative;
  overflow: hidden;
}
```

### Terminal Shadows (Layered)

```css
.terminal {
  border-radius: 12px;
  box-shadow:
    /* Ambient shadow */
    0 0 0 1px rgba(255, 255, 255, 0.03),
    /* Soft diffuse */
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    /* Medium depth */
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    /* Deep shadow */
    0 20px 25px -5px rgba(0, 0, 0, 0.4),
    /* Bottom glow (amber, subtle) */
    0 25px 50px -12px rgba(245, 158, 11, 0.08);
}
```

### Terminal Glow (Active State)

When the terminal shows "preserved" content, add a subtle amber glow:

```css
.terminal--active {
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.1),
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    0 20px 25px -5px rgba(0, 0, 0, 0.4),
    0 0 60px -12px rgba(245, 158, 11, 0.15),
    0 0 100px -20px rgba(245, 158, 11, 0.1);
  transition: box-shadow 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Scanline Effect (Subtle)

```css
.terminal-body::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  opacity: 0.5;
}
```

### Code Typography

```css
.terminal-code {
  font-family: var(--font-code);
  font-size: 14px;
  line-height: 1.7;
  letter-spacing: 0;
}
```

### Syntax Highlighting Colors

```css
:root {
  /* Terminal syntax colors */
  --syntax-prompt: #22C55E;         /* $ symbol, command prompts */
  --syntax-command: #FAFAF9;        /* Commands (git, npm, etc) */
  --syntax-flag: #60A5FA;           /* Flags like --help, -v */
  --syntax-string: #F59E0B;         /* Strings, paths */
  --syntax-comment: #52525B;        /* Comments */
  --syntax-keyword: #A78BFA;        /* Keywords */
  --syntax-variable: #34D399;       /* Variables */
  --syntax-output: #A1A1AA;         /* Command output */
  --syntax-highlight: #F59E0B;      /* Highlighted/important text */
  --syntax-error: #EF4444;          /* Errors */
  --syntax-warning: #FBBF24;        /* Warnings */
}
```

### Cursor

```css
.terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: var(--text-primary);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Terminal Line Structure

```tsx
interface TerminalLine {
  type: 'prompt' | 'output' | 'highlight' | 'empty';
  text: string;
  delay: number;          // ms before this line appears
  dissolve?: boolean;     // should this line dissolve?
  dissolveDelay?: number; // ms before dissolving
  preserve?: boolean;     // should this line glow amber (preserved)?
}
```

---

## Part 5: Card Components

### Base Card

```css
.card {
  background: linear-gradient(
    135deg,
    rgba(24, 24, 27, 0.8) 0%,
    rgba(17, 17, 19, 0.9) 100%
  );
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

/* Subtle inner glow */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.02) 0%,
    transparent 70%
  );
  pointer-events: none;
}
```

### Card Hover State

```css
.card:hover {
  border-color: var(--border-visible);
  background: linear-gradient(
    135deg,
    rgba(31, 31, 35, 0.9) 0%,
    rgba(24, 24, 27, 0.95) 100%
  );
  transform: translateY(-2px);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 10px 15px -3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Pain Point Cards (Problem Section)

```css
.pain-card {
  background: linear-gradient(
    180deg,
    rgba(24, 24, 27, 0.6) 0%,
    rgba(17, 17, 19, 0.8) 100%
  );
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  padding: 28px 24px;
}

.pain-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.pain-card__icon svg {
  width: 24px;
  height: 24px;
  color: #EF4444;
}

.pain-card__title {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.pain-card__description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pain-card__frequency {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 12px;
  font-style: italic;
}
```

### Pricing Cards

```css
.pricing-card {
  background: linear-gradient(
    180deg,
    rgba(24, 24, 27, 0.9) 0%,
    rgba(17, 17, 19, 0.95) 100%
  );
  border: 1px solid var(--border-visible);
  border-radius: 16px;
  padding: 32px;
  position: relative;
}

.pricing-card--highlighted {
  border-color: var(--amber);
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.2),
    0 0 40px -10px rgba(245, 158, 11, 0.15);
}

.pricing-card__badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--amber);
  color: #0A0A0B;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pricing-card__name {
  font-family: var(--font-headline);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.pricing-card__price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.pricing-card__price-value {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.pricing-card__price-period {
  font-size: 16px;
  color: var(--text-muted);
}

.pricing-card__annual {
  font-size: 14px;
  color: var(--amber);
  margin-bottom: 16px;
}

.pricing-card__description {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.pricing-card__features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.pricing-card__feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.pricing-card__feature-icon {
  width: 18px;
  height: 18px;
  color: var(--terminal-green);
  flex-shrink: 0;
  margin-top: 2px;
}
```

### Feature Cards (Solution Section)

```css
.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.03);
  border: 1px solid rgba(245, 158, 11, 0.08);
}

.feature-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-card__icon svg {
  width: 20px;
  height: 20px;
  color: var(--amber);
}

.feature-card__content {
  flex: 1;
}

.feature-card__title {
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 600;
  color: var(--amber);
  margin-bottom: 4px;
}

.feature-card__description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
```

---

## Part 6: Button Components

### Primary Button (CTA)

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  /* Sizing */
  height: 52px;
  padding: 0 28px;

  /* Typography */
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;

  /* Colors */
  background: var(--text-primary);
  color: var(--bg-void);

  /* Shape */
  border: none;
  border-radius: 6px;

  /* Behavior */
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(250, 250, 249, 0.2),
    0 8px 24px rgba(250, 250, 249, 0.1);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}
```

### Primary Button Shimmer Effect

```css
.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s ease;
}

.btn-primary:hover::before {
  left: 100%;
}
```

### Secondary Button (Ghost)

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  /* Sizing */
  height: 52px;
  padding: 0 24px;

  /* Typography */
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;

  /* Colors */
  background: transparent;
  color: var(--text-primary);

  /* Border */
  border: 1px solid var(--border-visible);
  border-radius: 6px;

  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--text-muted);
  background: rgba(255, 255, 255, 0.03);
}

.btn-secondary:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}
```

### Amber Accent Button

```css
.btn-amber {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  height: 52px;
  padding: 0 28px;

  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;

  background: var(--amber);
  color: #0A0A0B;

  border: none;
  border-radius: 6px;

  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-amber:hover {
  background: var(--amber-bright);
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(245, 158, 11, 0.3),
    0 8px 24px rgba(245, 158, 11, 0.15);
}
```

### Small Button

```css
.btn-sm {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 6px;
}
```

### Button with Icon

```css
.btn-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* GitHub icon specifically */
.btn-github-icon {
  width: 22px;
  height: 22px;
}
```

---

## Part 7: The Dissolving Memory Animation

### Particle System Concept

Text characters dissolve into particles that drift upward and fade. The effect suggests memory evaporating.

### Implementation Approach

Use canvas for particles, CSS for text opacity transitions.

### Dissolve Keyframes

```css
@keyframes dissolve-char {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  30% {
    opacity: 0.7;
    transform: translateY(-2px) scale(0.98);
    filter: blur(0.5px);
  }
  60% {
    opacity: 0.3;
    transform: translateY(-8px) scale(0.9);
    filter: blur(1px);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px) scale(0.5);
    filter: blur(2px);
  }
}
```

### Reconstruction Keyframes

```css
@keyframes reconstruct-char {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.5);
    filter: blur(2px);
    color: var(--text-muted);
  }
  40% {
    opacity: 0.5;
    transform: translateY(8px) scale(0.9);
    filter: blur(1px);
    color: var(--text-secondary);
  }
  70% {
    opacity: 0.8;
    transform: translateY(2px) scale(0.98);
    filter: blur(0.5px);
    color: var(--amber);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
    color: var(--amber);
  }
}
```

### Particle Configuration

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;           // velocity x (-0.5 to 0.5)
  vy: number;           // velocity y (-2 to -0.5, upward)
  size: number;         // 1-3px
  opacity: number;      // starts at 0.8, fades to 0
  color: string;        // matches text color
  lifetime: number;     // 60-120 frames
  age: number;          // current frame
}

const particleConfig = {
  particlesPerChar: 8,
  spawnRadius: 4,       // px from character center
  minSize: 1,
  maxSize: 3,
  minLifetime: 60,
  maxLifetime: 120,
  gravity: -0.02,       // negative = floats up
  friction: 0.98,
  fadeStart: 0.5,       // start fading at 50% lifetime
};
```

### Animation Timing

```typescript
const animationTiming = {
  // Phase 1: Show normal terminal
  normalDuration: 3000,      // 3s of normal operation

  // Phase 2: Text starts dissolving
  dissolveStartDelay: 3000,  // starts after normal phase
  dissolveStagger: 50,       // ms between each character
  dissolveDuration: 800,     // how long each char takes to dissolve

  // Phase 3: Pause at empty state
  emptyPauseDuration: 1500,  // 1.5s of emptiness

  // Phase 4: Recall branding appears
  recallAppearDelay: 4800,   // when "Recall" text fades in

  // Phase 5: Text reconstructs
  reconstructStartDelay: 5500,
  reconstructStagger: 30,    // faster than dissolve
  reconstructDuration: 600,

  // Phase 6: Glow and hold
  glowDelay: 6500,
  holdDuration: 4000,        // hold final state

  // Total loop: ~10.5 seconds
  loopDuration: 10500,
};
```

---

## Part 8: The .recall/ Folder Visual

When showing the file tree, use this styling:

### File Tree Container

```css
.file-tree {
  font-family: var(--font-code);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
  padding: 20px 24px;
  background: rgba(10, 10, 11, 0.5);
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}
```

### File Tree Items

```css
.file-tree__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.file-tree__item--folder {
  color: var(--text-primary);
}

.file-tree__item--file {
  color: var(--text-secondary);
}

.file-tree__item--recall {
  color: var(--amber);
  font-weight: 600;
}

.file-tree__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-tree__icon--folder {
  color: #60A5FA; /* Blue for folders */
}

.file-tree__icon--folder-recall {
  color: var(--amber);
}

.file-tree__icon--file {
  color: var(--text-muted);
}

.file-tree__annotation {
  margin-left: auto;
  font-size: 12px;
  color: var(--amber);
  opacity: 0.8;
}
```

### Indentation

```css
.file-tree__indent-1 { padding-left: 20px; }
.file-tree__indent-2 { padding-left: 40px; }
.file-tree__indent-3 { padding-left: 60px; }
```

### Example File Tree HTML

```html
<div class="file-tree">
  <div class="file-tree__item file-tree__item--folder">
    <svg class="file-tree__icon file-tree__icon--folder"><!-- folder icon --></svg>
    <span>.git/</span>
  </div>
  <div class="file-tree__item file-tree__item--folder file-tree__item--recall">
    <svg class="file-tree__icon file-tree__icon--folder-recall"><!-- folder icon --></svg>
    <span>.recall/</span>
    <span class="file-tree__annotation">team memory</span>
  </div>
  <div class="file-tree__item file-tree__item--file file-tree__indent-1">
    <svg class="file-tree__icon file-tree__icon--file"><!-- file icon --></svg>
    <span>context.md</span>
  </div>
  <div class="file-tree__item file-tree__item--file file-tree__indent-1">
    <svg class="file-tree__icon file-tree__icon--file"><!-- file icon --></svg>
    <span>history.md</span>
  </div>
  <div class="file-tree__item file-tree__item--folder file-tree__indent-1">
    <svg class="file-tree__icon file-tree__icon--folder"><!-- folder icon --></svg>
    <span>sessions/</span>
  </div>
  <div class="file-tree__item file-tree__item--folder">
    <svg class="file-tree__icon file-tree__icon--folder"><!-- folder icon --></svg>
    <span>src/</span>
  </div>
  <div class="file-tree__item file-tree__item--file">
    <svg class="file-tree__icon file-tree__icon--file"><!-- file icon --></svg>
    <span>package.json</span>
  </div>
</div>
```

---

## Part 9: Texture & Atmosphere

### Noise Overlay

Apply a subtle noise texture to the entire page for depth.

```css
.page-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.015;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
```

### Alternative: CSS Noise Pattern

```css
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    transparent 0,
    rgba(255, 255, 255, 0.01) 1px,
    transparent 2px
  );
  opacity: 0.3;
}
```

### Vignette Effect

```css
.page-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    ellipse at 50% 50%,
    transparent 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.4) 100%
  );
}
```

### Gradient Grain

For gradient backgrounds, add grain:

```css
.gradient-with-grain {
  background:
    /* Grain layer */
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E"),
    /* Actual gradient */
    linear-gradient(180deg, var(--bg-void) 0%, #0D0D10 100%);
}
```

### Ambient Glow Orbs

Subtle colored orbs in the background for atmosphere:

```css
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  pointer-events: none;
}

.ambient-orb--amber {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--amber) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  opacity: 0.08;
}

.ambient-orb--blue {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #3B82F6 0%, transparent 70%);
  bottom: 20%;
  left: -100px;
  opacity: 0.05;
}
```

---

## Part 10: Motion & Easing

### Easing Functions

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-bounce: cubic-bezier(0.34, 1.4, 0.64, 1);
}
```

### Standard Transitions

```css
/* Micro-interactions */
.transition-fast {
  transition: all 0.15s var(--ease-out-expo);
}

/* UI elements */
.transition-normal {
  transition: all 0.2s var(--ease-out-expo);
}

/* Page elements */
.transition-slow {
  transition: all 0.4s var(--ease-out-expo);
}

/* Dramatic reveals */
.transition-dramatic {
  transition: all 0.6s var(--ease-out-expo);
}
```

### Scroll-Triggered Animations (Framer Motion)

```tsx
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};
```

---

## Part 11: Header Component

### Fixed Header

```css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 24px;
  transition: all 0.3s var(--ease-out-expo);
}

.header--transparent {
  background: transparent;
}

.header--scrolled {
  background: rgba(10, 10, 11, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}
```

### Logo

```css
.header__logo {
  font-family: var(--font-headline);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  text-decoration: none;
}
```

### Navigation

```css
.header__nav {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-left: auto;
}

.header__nav-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.header__nav-link:hover {
  color: var(--text-primary);
}
```

---

## Part 12: Hero Section Layout

### Hero Container

```css
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
}
```

### Hero Content Stack

```css
.hero__content {
  max-width: 800px;
  text-align: center;
  margin-bottom: 64px;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: var(--amber);
  margin-bottom: 24px;
}

.hero__headline {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.0;
  margin-bottom: 24px;
}

.hero__headline-accent {
  color: var(--text-muted);
}

.hero__subhead {
  font-size: var(--text-body-lg);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 32px;
}

.hero__cta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.hero__social-proof {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 14px;
  color: var(--text-muted);
}

.hero__checkmark {
  width: 16px;
  height: 16px;
  color: var(--terminal-green);
}
```

### Hero Terminal Position

```css
.hero__terminal-wrapper {
  width: 100%;
  max-width: 900px;
  position: relative;
}

/* Ambient glow behind terminal */
.hero__terminal-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(
    ellipse at center,
    rgba(245, 158, 11, 0.05) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: -1;
}
```

---

## Part 13: Section Layouts

### Standard Section

```css
.section {
  padding: var(--space-32) var(--space-6);
  position: relative;
}

.section__container {
  max-width: var(--container-lg);
  margin: 0 auto;
}

.section__header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto var(--space-16);
}

.section__title {
  font-family: var(--font-headline);
  font-size: var(--text-display);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.section__subtitle {
  font-size: var(--text-body-lg);
  color: var(--text-secondary);
  line-height: 1.6;
}
```

### Grid Layouts

```css
/* 3-column grid for cards */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

@media (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}

/* 2-column grid for pricing */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
```

---

## Part 14: Trust Section

### Trust Icons Row

```css
.trust-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-10);
  flex-wrap: wrap;
}

.trust-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}

.trust-item__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.trust-item__icon svg {
  width: 24px;
  height: 24px;
  color: var(--terminal-green);
}

.trust-item__text {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 140px;
  line-height: 1.4;
}
```

---

## Part 15: Footer

```css
.footer {
  padding: var(--space-16) var(--space-6);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-void);
}

.footer__container {
  max-width: var(--container-xl);
  margin: 0 auto;
}

.footer__grid {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: var(--space-12);
  margin-bottom: var(--space-12);
}

@media (max-width: 768px) {
  .footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }
}

.footer__brand {
  max-width: 280px;
}

.footer__logo {
  font-family: var(--font-headline);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.footer__tagline {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.5;
}

.footer__column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer__link {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-3);
  transition: color 0.2s ease;
}

.footer__link:hover {
  color: var(--text-primary);
}

.footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-8);
  border-top: 1px solid var(--border-subtle);
}

.footer__copyright {
  font-size: 13px;
  color: var(--text-muted);
}

.footer__social {
  display: flex;
  gap: var(--space-4);
}

.footer__social-link {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.footer__social-link:hover {
  color: var(--text-primary);
}
```

---

## Part 16: Responsive Breakpoints

```css
/* Mobile first approach */

/* Small phones */
@media (min-width: 375px) { }

/* Large phones */
@media (min-width: 480px) { }

/* Tablets */
@media (min-width: 640px) { }

/* Small laptops */
@media (min-width: 768px) { }

/* Laptops */
@media (min-width: 1024px) { }

/* Desktops */
@media (min-width: 1280px) { }

/* Large desktops */
@media (min-width: 1440px) { }
```

### Key Responsive Adjustments

```css
/* Hero headline */
.hero__headline {
  font-size: 40px; /* mobile */
}

@media (min-width: 640px) {
  .hero__headline {
    font-size: 56px;
  }
}

@media (min-width: 1024px) {
  .hero__headline {
    font-size: 72px;
  }
}

/* Section titles */
.section__title {
  font-size: 28px; /* mobile */
}

@media (min-width: 640px) {
  .section__title {
    font-size: 40px;
  }
}

@media (min-width: 1024px) {
  .section__title {
    font-size: 56px;
  }
}

/* Terminal */
.terminal {
  max-width: 100%;
  min-height: 320px; /* mobile */
}

@media (min-width: 768px) {
  .terminal {
    min-height: 420px;
  }
}
```

---

## Part 17: Accessibility

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}

/* Skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--amber);
  color: #0A0A0B;
  padding: 8px 16px;
  z-index: 10000;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 0;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .terminal-cursor {
    animation: none;
    opacity: 1;
  }
}
```

### Color Contrast

All text meets WCAG AA standards:
- `--text-primary` (#FAFAF9) on `--bg-void` (#0A0A0B): 18.1:1
- `--text-secondary` (#A1A1AA) on `--bg-void` (#0A0A0B): 7.2:1
- `--text-muted` (#71717A) on `--bg-void` (#0A0A0B): 4.5:1 (meets AA for large text)
- `--amber` (#F59E0B) on `--bg-void` (#0A0A0B): 8.3:1

---

## Part 18: Implementation Checklist

### Fonts to Load
- [ ] Space Grotesk (500, 600, 700)
- [ ] JetBrains Mono (400, 500, 600, 700)
- [ ] Inter (400, 500, 600, 700)

### Components to Build
- [ ] Terminal with chrome and styling
- [ ] Dissolve animation system (particles + text)
- [ ] Primary button with shimmer
- [ ] Secondary button
- [ ] Pain point cards
- [ ] Feature cards
- [ ] Pricing cards
- [ ] File tree component
- [ ] Trust item component
- [ ] Header (transparent + scrolled states)
- [ ] Footer

### Global Styles
- [ ] CSS variables for colors
- [ ] CSS variables for typography
- [ ] CSS variables for spacing
- [ ] Noise overlay
- [ ] Vignette effect
- [ ] Scrollbar styling
- [ ] Selection styling
- [ ] Focus styles

### Animations
- [ ] Dissolve keyframes
- [ ] Reconstruct keyframes
- [ ] Particle canvas
- [ ] Scroll-triggered reveals
- [ ] Button hover effects
- [ ] Terminal glow pulse

### Responsive
- [ ] Mobile hero layout
- [ ] Mobile terminal sizing
- [ ] Mobile grid adjustments
- [ ] Mobile typography scale

---

## Part 19: Terminal Content Script

The exact content to display in the terminal animation:

### Phase 1: Normal Operation (0-3s)

```
$ claude "how does auth work here?"

Based on the codebase, authentication uses...

- JWT tokens stored in httpOnly cookies
- Refresh tokens rotate every 7 days
- Sessions tracked in Redis
```

### Phase 2: Dissolve (3-5s)

Each character dissolves from right to left, top to bottom. Particles float upward.

### Phase 3: Empty + Recall Appears (5-5.5s)

Terminal shows blank, then:

```
.recall/context.md loaded...
```

This line types in, character by character, in amber.

### Phase 4: Reconstruction (5.5-7s)

The original content reconstructs, but now in amber, with additional context:

```
$ claude "how does auth work here?"

[context loaded: 47 team decisions, 12 lessons learned]

Based on your team's context:

- Auth uses JWT + httpOnly cookies (decision: @sarah, Nov 3)
- Don't use localStorage (breaks Safari private - learned hard way)
- Refresh tokens rotate every 7d (matched Stripe's pattern)
- Rate limit: 100 auth/min (prod constraint)
```

### Phase 5: Hold with Glow (7-10.5s)

Content stays visible with subtle amber glow on terminal. Shows the value: same question, richer answer.

---

## Part 20: File Exports

This spec should be implemented across these files:

```
web/
  src/
    app/
      globals.css          # CSS variables, global styles
      page.tsx             # Homepage with all sections
    components/
      Terminal.tsx         # Terminal component with animation
      DissolveText.tsx     # Text dissolve effect
      ParticleCanvas.tsx   # Canvas for particles
      Button.tsx           # Button variants
      Card.tsx             # Card variants
      FileTree.tsx         # File tree display
      Header.tsx           # Fixed header
      Footer.tsx           # Footer
      sections/
        Hero.tsx           # Hero section
        Problem.tsx        # Problem/pain points
        Solution.tsx       # Solution/features
        HowItWorks.tsx     # Steps
        Trust.tsx          # Trust signals
        Pricing.tsx        # Pricing cards
        FinalCTA.tsx       # Final call to action
    lib/
      motion.ts            # Framer Motion variants

  tailwind.config.ts       # Updated with new tokens
```

---

*This specification is build-ready. Every visual detail has been defined. Build exactly this.*
