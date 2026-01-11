# Recall Homepage Redesign - Complete Build Specification

**Version:** 1.0
**Date:** January 10, 2026
**Status:** Ready for Development
**Concept:** "The Dissolving Memory"

---

## Design Concept

Text and code that dissolve into particles, then reconstruct when Recall is introduced. The hero dramatizes the problem (context fading away) and the solution (memory becoming permanent).

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0A0A0B` | Page background |
| `--bg-elevated` | `#18181B` | Cards, terminal, elevated surfaces |
| `--bg-hover` | `#27272A` | Hover states, dividers |
| `--text-primary` | `#FAFAF9` | Headlines, primary text (warm white) |
| `--text-secondary` | `#A1A1AA` | Body text, descriptions |
| `--text-muted` | `#71717A` | Tertiary text, timestamps |
| `--decay-start` | `#71717A` | Text before dissolving (matches muted) |
| `--decay-end` | `#27272A` | Particles fade to this |
| `--accent` | `#F59E0B` | Amber - preserved memory, highlights |
| `--accent-glow` | `rgba(245, 158, 11, 0.4)` | Glow effects on amber |
| `--border-subtle` | `#27272A` | Default borders |
| `--border-visible` | `#3F3F46` | Prominent borders |
| `--success` | `#22C55E` | Terminal prompts, checkmarks |

---

## Typography

| Element | Font | Size Desktop | Size Mobile | Weight | Line Height | Letter Spacing |
|---------|------|--------------|-------------|--------|-------------|----------------|
| Display (Hero H1) | Space Grotesk | 72px | 40px | 700 | 1.1 | -0.02em |
| H1 (Section) | JetBrains Mono | 40px | 28px | 600 | 1.2 | -0.015em |
| H2 (Subsection) | JetBrains Mono | 28px | 22px | 600 | 1.3 | -0.01em |
| H3 (Card Title) | JetBrains Mono | 20px | 18px | 600 | 1.4 | 0 |
| Body Large | Inter | 20px | 18px | 400 | 1.6 | 0 |
| Body | Inter | 16px | 16px | 400 | 1.625 | 0 |
| Code | JetBrains Mono | 14px | 13px | 400 | 1.7 | 0 |
| Caption | Inter | 14px | 13px | 400 | 1.5 | 0 |

**Font Loading:**
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap');
```

---

## Global Specifications

### Responsive Breakpoints

| Breakpoint | Width | Section Padding | Content Max-Width |
|------------|-------|-----------------|-------------------|
| Mobile | < 640px | 24px horizontal, 64px vertical | 100% |
| Tablet | 640px - 1024px | 48px horizontal, 96px vertical | 720px |
| Desktop | > 1024px | 64px horizontal, 128px vertical | 1280px |

### Spacing Scale

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-24` | 96px |
| `space-32` | 128px |

### Animation Curves

| Curve | Value | Usage |
|-------|-------|-------|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, reveals |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | State changes |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions |
| `dissolve` | `cubic-bezier(0.4, 0, 0.6, 1)` | Particle dissolve effect |

### Noise Texture

Apply subtle noise overlay to the entire page:
```css
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background-image: url('/noise.png');
  opacity: 0.03;
  z-index: 9999;
}
```

**noise.png:** 200x200 grayscale noise, 50% gray base, exported as PNG-8.

---

## Section 1: Header/Navigation

### Layout

```
+------------------------------------------------------------------------+
|  [Logo]  recall                         [Docs] [Pricing] [GitHub] [CTA] |
+------------------------------------------------------------------------+
```

### Specifications

| Property | Value |
|----------|-------|
| Height | 64px |
| Position | Fixed, top: 0, z-index: 50 |
| Background (default) | Transparent |
| Background (scrolled) | `rgba(10, 10, 11, 0.85)` + `backdrop-filter: blur(12px)` |
| Border (scrolled) | 1px solid `#27272A` |
| Transition | `background 300ms ease-out, border-color 300ms ease-out` |
| Max content width | 1280px |
| Horizontal padding | 24px mobile, 64px desktop |

### Logo Treatment

- Text: "recall" in lowercase
- Font: Space Grotesk Bold
- Size: 24px
- Color: `#FAFAF9`
- Letter-spacing: -0.02em
- No icon/symbol

### Navigation Items

| Item | Link | Desktop | Mobile |
|------|------|---------|--------|
| Docs | `/docs` | Visible | In hamburger |
| Pricing | `/pricing` | Visible | In hamburger |
| GitHub | External | Visible | In hamburger |
| Login | `/login` | Visible when logged out | In hamburger |
| CTA | `/signup` | Visible when logged out | Always visible |

**Nav Link Styling:**
- Font: Inter Medium
- Size: 15px
- Color: `#A1A1AA`
- Hover: `#FAFAF9`, transition 150ms

**CTA Button:**
- Text: "Start Trial"
- Background: `#FAFAF9`
- Text color: `#0A0A0B`
- Padding: 12px 20px
- Border-radius: 4px
- Font: Inter SemiBold 15px
- Hover: `translateY(-1px)`, `box-shadow: 0 8px 24px rgba(250, 250, 249, 0.15)`
- Transition: `transform 200ms ease-out, box-shadow 200ms ease-out`

### Mobile Hamburger

**Trigger (< 768px):**
- 3-line icon, 24x24px, `#FAFAF9`
- Position: Right side of header

**Menu Panel:**
- Slides in from right
- Full height, 280px width
- Background: `#0A0A0B`
- Border-left: 1px solid `#27272A`
- Staggered link reveal: 50ms delay per item

### Scroll Behavior

```typescript
const SCROLL_THRESHOLD = 48;
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

---

## Section 2: Hero

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|        [Badge: The first team memory layer for AI coding tools]        |
|                                                                        |
|                    Your AI coding assistant                            |
|                    forgets everything.                                  |
|                                                                        |
|                    [forgets everything. dissolves into particles]      |
|                    [reconstructs as: remembers everything.]            |
|                                                                        |
|                    Every session starts fresh.                         |
|                    Recall fixes that.                                  |
|                                                                        |
|                    [Start Trial]  [View Docs]                          |
|                                                                        |
|                    [Works with: Claude Code | Cursor soon]             |
|                                                                        |
|        +--------------------------------------------------+            |
|        |                                                  |            |
|        |              [Terminal Animation]                |            |
|        |                                                  |            |
|        +--------------------------------------------------+            |
|                                                                        |
+------------------------------------------------------------------------+
```

### Viewport Specifications

| Property | Value |
|----------|-------|
| Min-height | 100vh |
| Padding-top | 120px (accounts for fixed header + breathing room) |
| Padding-bottom | 64px |
| Background | `#0A0A0B` |
| Display | Flex, column, center |

### Badge (Above Headline)

- Text: "The first team memory layer for AI coding tools"
- Background: `rgba(245, 158, 11, 0.1)`
- Border: 1px solid `rgba(245, 158, 11, 0.3)`
- Text color: `#F59E0B`
- Padding: 8px 16px
- Border-radius: 9999px (pill)
- Font: Inter Medium 14px
- Entrance: fade + slide up, 600ms, delay 0ms

### Headline Typography

```
Your AI coding assistant          <- Line 1
forgets everything.               <- Line 2 (dissolving text)
```

- Font: Space Grotesk Bold
- Size: 72px desktop, 40px mobile
- Line-height: 1.1
- Letter-spacing: -0.02em
- Max-width: 800px
- Text-align: center
- Color Line 1: `#FAFAF9`
- Color Line 2: `#A1A1AA` initially, dissolves

### The Dissolving Animation - EXACT SPECIFICATION

**Phase 1: Initial State (0-2000ms)**
- "forgets everything." appears in `#A1A1AA`
- Fully readable, static
- User has time to read and understand

**Phase 2: Dissolution (2000-3500ms)**
Each character dissolves individually with staggered timing:

1. **Character Selection:** Characters dissolve left-to-right with 30ms stagger
2. **Particle Generation:** Each character spawns 12-18 particles
3. **Particle Properties:**
   - Size: 2-4px circles
   - Initial color: `#A1A1AA`
   - Final color: `#27272A` (fade to near-background)
   - Initial position: Character bounding box
   - Movement: Random vectors, slight upward bias
   - Distance: 80-150px from origin
   - Duration: 800ms per particle
   - Easing: `dissolve` curve
   - Opacity: 1 -> 0 over duration
   - Rotation: Random 0-360deg added during movement

4. **Character Fade:** As particles spawn, the character fades:
   - Opacity: 1 -> 0 over 400ms
   - Blur: 0 -> 4px over 400ms
   - Scale: 1 -> 0.8 over 400ms

**Phase 3: Pause (3500-4000ms)**
- Empty space where text was
- Particles have fully dissipated
- Brief moment of absence (the problem felt)

**Phase 4: Reconstruction (4000-5500ms)**
New text "remembers everything." reconstructs:

1. **Particle Spawn:** Particles appear from scattered positions
2. **Particle Properties:**
   - Initial position: Random within 150px radius of target
   - Initial color: `#27272A`
   - Movement: Converge toward character positions
   - Duration: 600ms per particle
   - Easing: `ease-out`

3. **Character Formation:**
   - As particles arrive, characters fade in
   - Color: `#F59E0B` (amber)
   - Opacity: 0 -> 1 over 400ms
   - Blur: 4px -> 0 over 400ms
   - Scale: 1.1 -> 1 over 400ms (slight pop)
   - Text-shadow: `0 0 20px rgba(245, 158, 11, 0.5)` (glow)

**Phase 5: Settled State (5500ms+)**
- "remembers everything." in amber with subtle glow
- Glow pulses subtly: `box-shadow` animates opacity 0.3 -> 0.5 -> 0.3 over 3s, infinite
- Text remains stable

**Implementation Notes:**
- Use canvas overlay for particles (better performance than DOM)
- Text uses CSS animations, canvas for particles
- Respect `prefers-reduced-motion`: skip to final state immediately
- Loop: Animation restarts after 8000ms (3s pause in final state)

### Subheadline

```
Every session starts fresh. Recall fixes that.
```

- Font: Inter Regular
- Size: 20px desktop, 18px mobile
- Color: `#A1A1AA`
- Max-width: 540px
- Text-align: center
- Margin-top: 32px from headline
- Entrance: fade + slide up, 600ms, delay 300ms

### CTA Buttons

**Primary Button:**
- Text: "Start Trial" with GitHub icon (24x24) to left
- Background: `#FAFAF9`
- Text color: `#0A0A0B`
- Padding: 16px 32px
- Border-radius: 4px
- Font: Inter SemiBold 18px
- Gap between icon and text: 12px
- Hover: `translateY(-2px)`, `box-shadow: 0 12px 32px rgba(250, 250, 249, 0.2)`
- Active: `translateY(0)`, reduced shadow
- Transition: `transform 200ms ease-out, box-shadow 200ms ease-out`
- Entrance: fade + slide up, 600ms, delay 400ms

**Secondary Button:**
- Text: "View Docs"
- Background: transparent
- Text color: `#FAFAF9`
- Padding: 16px 32px
- Font: Inter SemiBold 18px
- Hover: `color: #A1A1AA`
- Transition: `color 150ms ease`
- Entrance: fade + slide up, 600ms, delay 450ms

**Layout:**
- Flex row on desktop, gap 16px
- Stack column on mobile, gap 12px
- Margin-top: 40px from subheadline

### Works With Badge

```
[checkmark] Works with Claude Code  |  Cursor, Windsurf, Codex CLI coming soon
```

- Font: Inter Regular 14px
- Color: `#71717A`
- Checkmark: `#22C55E`, 16x16
- Divider: `|` in `#3F3F46`
- "coming soon" items: `#52525B` (darker muted)
- Margin-top: 24px from buttons
- Entrance: fade, 600ms, delay 500ms

### Terminal Animation

Position: Below hero text, full width up to 896px, centered

**Container:**
- Max-width: 896px
- Margin-top: 64px
- Border: 1px solid `#27272A`
- Border-radius: 12px
- Background: `#18181B`
- Box-shadow: `0 24px 64px rgba(0, 0, 0, 0.4)`
- Overflow: hidden
- Entrance: fade + slide up 40px, 600ms, delay 700ms

**Title Bar:**
- Height: 44px
- Background: `#27272A`
- Border-bottom: 1px solid `#27272A`
- Traffic lights: 12px circles, gap 8px, left-aligned with 16px padding
  - Red: `#FF5F56`
  - Yellow: `#FFBD2E`
  - Green: `#27C93F`
- Title: "terminal" in JetBrains Mono 13px `#71717A`, centered

**Terminal Content:**
- Padding: 20px
- Font: JetBrains Mono 14px
- Line-height: 1.7
- Min-height: 360px

**Terminal Script:**
```
$ git clone git@github.com:acme/app.git          [delay 0ms]
Cloning into 'app'...                            [delay 800ms]
Receiving objects: 100%                          [delay 1200ms]
                                                 [delay 1400ms]
$ cd app && ls -la                               [delay 1800ms]
.git/                                            [delay 2200ms]
.recall/          <- team memory                 [delay 2400ms] HIGHLIGHT
src/                                             [delay 2600ms]
package.json                                     [delay 2700ms]
                                                 [delay 2900ms]
$ cat .recall/context.md                         [delay 3300ms]
# Team Context                                   [delay 3700ms]
- Auth uses Supabase (decision: Nov 3, @devon)   [delay 3900ms]
- Don't use moment.js - broke build              [delay 4100ms]
- API rate limiting: 100/min (prod constraint)   [delay 4300ms]
                                                 [delay 4500ms]
$ claude "how does auth work here?"              [delay 5000ms]
Based on your team's context, auth uses          [delay 5600ms]
Supabase with magic links...                     [delay 5800ms]
```

**Line Styling:**
- Prompt `$`: `#22C55E`
- Commands: `#FAFAF9`
- Output: `#A1A1AA`
- Highlight line (`.recall/`): `#F59E0B` with subtle pulse glow

**Line Animation:**
- Each line fades + slides up 8px
- Duration: 200ms
- Easing: `ease-out`

**Cursor:**
- Appears after final line
- 2px width, 20px height
- Color: `#FAFAF9`
- Blink: opacity 0 -> 1 -> 0, 1000ms, infinite

---

## Section 3: Problem

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|       Every day, your team loses 47 hours to forgotten context.        |
|                        [animated counter]                              |
|                                                                        |
|   +--------------------+  +--------------------+  +--------------------+
|   |  Re-explaining     |  |  Re-making         |  |  Re-litigating    |
|   |  context           |  |  mistakes          |  |  decisions        |
|   |                    |  |                    |  |                   |
|   |  "We use JWT,      |  |  "localStorage     |  |  "Why did we      |
|   |   not sessions,    |  |   breaks Safari    |  |   choose Stripe?" |
|   |   because..."      |  |   private mode"    |  |                   |
|   |                    |  |                    |  |                   |
|   |  Every session     |  |  Every sprint      |  |  Every month      |
|   +--------------------+  +--------------------+  +--------------------+
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#0A0A0B` |
| Padding | 128px vertical desktop, 64px mobile |
| Max content width | 1120px |

### Headline with Counter

**Text:** "Every day, your team loses **47 hours** to forgotten context."

- Font: JetBrains Mono SemiBold
- Size: 40px desktop, 28px mobile
- Color: `#FAFAF9`
- "47 hours" is the animated portion, color `#F59E0B`
- Text-align: center
- Max-width: 800px
- Entrance: fade + slide up, 600ms, on viewport enter

**Counter Animation:**
- Start value: 0
- End value: 47
- Duration: 2000ms
- Easing: `ease-out`
- Trigger: when section enters viewport
- Format: integers only, no decimals
- Use `requestAnimationFrame` for smooth counting

### Pain Point Cards

**Grid:**
- 3 columns desktop, 1 column mobile
- Gap: 24px
- Max-width: 1024px

**Card Styling:**
- Background: `#18181B`
- Border: 1px solid `#27272A`
- Border-radius: 12px
- Padding: 32px
- Hover: Border color `#3F3F46`, `translateY(-4px)`, `box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3)`
- Transition: `border-color 200ms, transform 200ms ease-out, box-shadow 200ms ease-out`
- Entrance: staggered, 100ms delay between cards

**Card Content:**

| Card | Title | Quote | Frequency |
|------|-------|-------|-----------|
| 1 | Re-explaining context | "We use JWT, not sessions, because..." | Every session |
| 2 | Re-making mistakes | "localStorage breaks Safari private mode" | Every sprint |
| 3 | Re-litigating decisions | "Why did we choose Stripe?" | Every month |

**Title:**
- Font: JetBrains Mono SemiBold 20px
- Color: `#FAFAF9`
- Margin-bottom: 16px

**Quote:**
- Font: Inter Regular 16px
- Color: `#A1A1AA`
- Style: Italic
- Quotes: Use typographic quotes
- Margin-bottom: 24px

**Frequency:**
- Font: Inter Medium 14px
- Color: `#F59E0B`
- Uppercase
- Letter-spacing: 0.05em

---

## Section 4: Demo/Product

### Concept

Two-panel layout showing a Claude Code conversation where the AI references team context it "shouldn't" know.

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|                    See what changes                                    |
|                                                                        |
|   +------------------------------+  +------------------------------+   |
|   |       BEFORE RECALL          |  |        WITH RECALL           |   |
|   |                              |  |                              |   |
|   | User: How should I handle    |  | User: How should I handle    |   |
|   | auth in this project?        |  | auth in this project?        |   |
|   |                              |  |                              |   |
|   | AI: There are many ways...   |  | AI: Based on your team's     |   |
|   | JWT, sessions, OAuth...      |  | context, you're using        |   |
|   | What are your requirements?  |  | Supabase with magic links.   |   |
|   |                              |  | @devon set this up in Nov.   |   |
|   |                              |  | I see there's a known issue  |   |
|   |                              |  | with token refresh...        |   |
|   +------------------------------+  +------------------------------+   |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#18181B` |
| Padding | 128px vertical desktop, 64px mobile |
| Max content width | 1200px |

### Headline

- Text: "See what changes"
- Font: JetBrains Mono SemiBold 40px
- Color: `#FAFAF9`
- Text-align: center
- Margin-bottom: 64px
- Entrance: fade + slide up, 600ms

### Comparison Panels

**Container:**
- Display: Grid
- Columns: 2 equal on desktop, stack on mobile
- Gap: 32px

**Panel Styling:**
- Background: `#0A0A0B`
- Border: 1px solid `#27272A`
- Border-radius: 12px
- Overflow: hidden

**Panel Header:**
- Height: 48px
- Padding: 0 20px
- Background: `#27272A`
- Font: JetBrains Mono SemiBold 14px
- Letter-spacing: 0.05em
- Uppercase
- Border-bottom: 1px solid `#27272A`
- "BEFORE RECALL": Color `#71717A`
- "WITH RECALL": Color `#F59E0B`

**Panel Content:**
- Padding: 24px
- Font: Inter Regular 15px
- Line-height: 1.7

**Conversation Styling:**

*User Message:*
- Background: `#27272A`
- Border-radius: 8px
- Padding: 12px 16px
- Margin-bottom: 16px
- Color: `#FAFAF9`

*AI Message:*
- Background: transparent
- Padding: 12px 0
- Color: `#A1A1AA`
- "With Recall" version highlights:
  - Team references (`@devon`, "your team's context"): `#F59E0B`
  - Decision citations: `#F59E0B`

**Before Panel Content:**
```
User: How should I handle auth in this project?

AI: There are several approaches to authentication.
You could use JWT tokens, server-side sessions,
or OAuth providers like Google or GitHub.

What are your requirements? Do you need
social login, magic links, or password-based auth?
```

**With Recall Panel Content:**
```
User: How should I handle auth in this project?

AI: Based on your team's context, you're using
Supabase with magic links. @devon set this up
in November and documented the decision.

I see there's a known issue with token refresh
in Safari - your teammate @maya ran into this
last week. Check the context for the workaround.
```

**Animation:**
- Panels entrance: fade + slide up, 600ms, 100ms stagger
- Text in panels types in character by character (optional enhancement)
- Loop: Reset and replay every 15 seconds

---

## Section 5: How It Works

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|                    5 minutes to set up. Then forget about it.          |
|                                                                        |
|        [1]                    [2]                    [3]               |
|         |                      |                      |                |
|    Connect GitHub         Add the MCP           Just code             |
|    OAuth in, pick        One command in         Recall runs at        |
|    your repos            your terminal          session end           |
|         |                      |                      |                |
|         +----------[-----------]----------[-----------]+               |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#0A0A0B` |
| Padding | 128px vertical desktop, 64px mobile |
| Max content width | 1024px |

### Headline

- Text: "5 minutes to set up. Then forget about it."
- Font: JetBrains Mono SemiBold 40px
- Color: `#FAFAF9`
- Text-align: center
- Margin-bottom: 80px
- Entrance: fade + slide up, 600ms

### Steps Grid

- Display: Grid
- Columns: 3 equal on desktop, 1 column mobile
- Gap: 48px desktop, 32px mobile
- Position: relative (for connecting line)

### Step Cards

**Number Circle:**
- Size: 56px
- Background: `#F59E0B`
- Color: `#0A0A0B`
- Font: JetBrains Mono Bold 24px
- Border-radius: 50%
- Margin: 0 auto 24px
- Box-shadow: `0 0 0 8px rgba(245, 158, 11, 0.15)`

**Title:**
- Font: JetBrains Mono SemiBold 20px
- Color: `#FAFAF9`
- Text-align: center
- Margin-bottom: 12px

**Description:**
- Font: Inter Regular 16px
- Color: `#A1A1AA`
- Text-align: center
- Max-width: 240px
- Margin: 0 auto

### Step Content

| Step | Title | Description |
|------|-------|-------------|
| 1 | Connect GitHub | OAuth in, pick your repos. We create the `.recall/` folder. |
| 2 | Add the MCP | One command in your terminal. Works with Claude Code. |
| 3 | Just code | That's it. Recall runs automatically at session end. |

### Connecting Line (Desktop Only)

- Position: absolute
- Top: 28px (center of number circles)
- Left: calc(16.67% + 28px) (after first circle)
- Right: calc(16.67% + 28px) (before last circle)
- Height: 2px
- Background: `linear-gradient(90deg, #F59E0B 0%, #27272A 50%, #F59E0B 100%)`
- Z-index: -1

**Animation on scroll:**
1. Line draws from left to right: `scaleX(0)` to `scaleX(1)`, 800ms, delay after step 1 appears
2. `transform-origin: left`
3. Easing: `ease-out`

### Step Entrance Animation

- Staggered: 150ms delay between steps
- Each step: fade + slide up 20px, 600ms
- Trigger: viewport intersection

### Footer Text

```
No commands to remember. No files to update.
Your .recall/ folder syncs with your repo - context travels with your code.
```

- Font: Inter Regular 16px
- Color: `#71717A`
- Text-align: center
- Margin-top: 64px
- `.recall/`: Color `#F59E0B`, font JetBrains Mono

---

## Section 6: Trust & Security

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|              Your repo. Your data. We just process and delete.         |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   |                                                                |   |
|   |   [icon] Memory lives in YOUR GitHub repo                      |   |
|   |   [icon] End-to-end encrypted (we can't read it)               |   |
|   |   [icon] We process sessions, push to your repo, then delete   |   |
|   |   [icon] Nothing stored on our servers except encryption keys  |   |
|   |   [icon] Delete your repo = delete your data                   |   |
|   |                                                                |   |
|   +----------------------------------------------------------------+   |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   |  Need tighter control?                                         |   |
|   |  Enterprise teams bring their own LLM key. Summarization       |   |
|   |  happens on your infrastructure.                               |   |
|   +----------------------------------------------------------------+   |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#18181B` |
| Padding | 128px vertical desktop, 64px mobile |
| Max content width | 800px |

### Headline

- Text: "Your repo. Your data. We just process and delete."
- Font: JetBrains Mono SemiBold 40px
- Color: `#FAFAF9`
- Text-align: center
- Margin-bottom: 16px
- Entrance: fade + slide up, 600ms

### Subheadline

- Text: "When a session ends, Recall summarizes it, encrypts the result, and pushes to your repo. The raw session is deleted immediately."
- Font: Inter Regular 20px
- Color: `#A1A1AA`
- Text-align: center
- Max-width: 640px
- Margin: 0 auto 48px
- Entrance: fade + slide up, 600ms, delay 100ms

### Trust Points List

**Container:**
- Background: `#0A0A0B`
- Border: 1px solid `#27272A`
- Border-radius: 12px
- Padding: 32px
- Margin-bottom: 32px
- Entrance: fade + slide up, 600ms, delay 200ms

**List Items:**
- Display: flex column
- Gap: 20px

**Each Item:**
- Display: flex row
- Gap: 16px
- Align: flex-start

**Icon:**
- Size: 24x24
- Color: `#22C55E`
- Icon: Checkmark circle (or shield for security items)

**Text:**
- Font: Inter Regular 16px
- Color: `#FAFAF9`
- "YOUR" emphasized: Color `#F59E0B`, font-weight 600

**Trust Points:**
1. "Memory lives in YOUR GitHub repo"
2. "End-to-end encrypted (we can't read it)"
3. "We process sessions, push to your repo, then delete"
4. "Nothing stored on our servers except encryption keys"
5. "Delete your repo = delete your data"

### Enterprise Callout

**Container:**
- Background: transparent
- Border: 1px solid `rgba(245, 158, 11, 0.3)`
- Border-radius: 12px
- Padding: 24px 32px
- Entrance: fade + slide up, 600ms, delay 300ms

**Title:**
- Text: "Need tighter control?"
- Font: JetBrains Mono SemiBold 18px
- Color: `#FAFAF9`
- Margin-bottom: 8px

**Description:**
- Text: "Enterprise teams bring their own LLM key. Summarization happens on your infrastructure - nothing touches Recall servers."
- Font: Inter Regular 16px
- Color: `#A1A1AA`

---

## Section 7: Pricing

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|          Less than one hour of developer time. Saves dozens.           |
|                    14-day free trial. Cancel anytime.                  |
|                                                                        |
|        +---------------------------+  +---------------------------+    |
|        |      [Most Popular]       |  |                           |    |
|        |         TEAM              |  |       ENTERPRISE          |    |
|        |                           |  |                           |    |
|        |    $12 /seat/month        |  |    $30 /seat/month        |    |
|        |                           |  |                           |    |
|        |  [x] Unlimited repos      |  |  [x] Everything in Team   |    |
|        |  [x] Unlimited sessions   |  |  [x] Bring Your Own LLM   |    |
|        |  [x] AI summaries         |  |  [x] Code never leaves    |    |
|        |  [x] Encrypted sharing    |  |  [x] SSO / SAML           |    |
|        |  [x] We summarize         |  |  [x] Priority support     |    |
|        |                           |  |                           |    |
|        |    [Start Free Trial]     |  |    [Start Free Trial]     |    |
|        |                           |  |                           |    |
|        | Save 17% with annual      |  | Save 17% with annual      |    |
|        +---------------------------+  +---------------------------+    |
|                                                                        |
|                Need 50+ seats? Let's talk.                             |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#0A0A0B` |
| Padding | 128px vertical desktop, 64px mobile |
| Max content width | 920px |
| ID | `#pricing` (for nav scroll) |

### Headline

- Text: "Less than one hour of developer time. Saves dozens."
- Font: JetBrains Mono SemiBold 40px
- Color: `#FAFAF9`
- Text-align: center
- Margin-bottom: 16px

### Subheadline

- Text: "14-day free trial. Cancel anytime."
- Font: Inter Regular 20px
- Color: `#A1A1AA`
- Text-align: center
- Margin-bottom: 64px

### Pricing Cards Grid

- Display: Grid
- Columns: 2 equal on desktop, 1 column mobile
- Gap: 24px
- Max-width: 720px
- Margin: 0 auto

### Card Styling

**Base Card:**
- Background: `#18181B`
- Border: 1px solid `#27272A`
- Border-radius: 12px
- Padding: 32px
- Display: flex column

**Highlighted Card (Team):**
- Border: 1px solid `#F59E0B`
- Box-shadow: `0 0 32px rgba(245, 158, 11, 0.1)`

**Badge (Team only):**
- Position: absolute
- Top: -14px
- Left: 50%
- Transform: translateX(-50%)
- Background: `#F59E0B`
- Color: `#0A0A0B`
- Padding: 6px 16px
- Border-radius: 9999px
- Font: Inter SemiBold 13px
- Text: "Most Popular"

### Card Content

**Plan Name:**
- Font: JetBrains Mono SemiBold 20px
- Color: `#FAFAF9`
- Margin-bottom: 8px

**Price:**
- Font: Space Grotesk Bold 48px
- Color: `#FAFAF9`
- Display: inline

**Period:**
- Font: Inter Regular 16px
- Color: `#71717A`
- Display: inline
- Text: "/seat/month"

**Description:**
- Font: Inter Regular 15px
- Color: `#A1A1AA`
- Margin: 8px 0 24px

### Features List

- Margin-bottom: 32px
- Flex-grow: 1 (pushes CTA to bottom)

**Each Feature:**
- Display: flex row
- Gap: 12px
- Align: flex-start
- Margin-bottom: 12px

**Checkmark:**
- Size: 20x20
- Color: `#22C55E`
- Flex-shrink: 0
- Margin-top: 2px

**Feature Text:**
- Font: Inter Regular 15px
- Color: `#A1A1AA`

### Features by Plan

**Team:**
1. Unlimited repos
2. Unlimited sessions
3. AI-powered summaries
4. Encrypted sharing
5. We handle summarization

**Enterprise:**
1. Everything in Team
2. Bring Your Own LLM Key
3. Code never touches our servers
4. SSO / SAML
5. SLA & dedicated support

### CTA Button

**Team (Highlighted):**
- Width: 100%
- Background: `#FAFAF9`
- Color: `#0A0A0B`
- Padding: 16px
- Border-radius: 8px
- Font: Inter SemiBold 16px
- Text: "Start Free Trial"
- Hover: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(250, 250, 249, 0.15)`

**Enterprise:**
- Width: 100%
- Background: transparent
- Border: 1px solid `#3F3F46`
- Color: `#FAFAF9`
- Padding: 16px
- Border-radius: 8px
- Font: Inter SemiBold 16px
- Text: "Start Free Trial"
- Hover: Border color `#71717A`

### Annual Savings Note

- Text: "Save 17% with annual billing"
- Font: Inter Regular 14px
- Color: `#F59E0B`
- Text-align: center
- Margin-top: 16px

### Enterprise Contact

- Text: "Need 50+ seats? Let's talk."
- Font: Inter Regular 16px
- Color: `#71717A`
- Text-align: center
- Margin-top: 48px
- "Let's talk." is a link:
  - Color: `#F59E0B`
  - Hover: underline
  - Href: `mailto:enterprise@recall.team`

---

## Section 8: Final CTA

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|        [Badge: The first team memory layer for AI coding tools]        |
|                                                                        |
|           Your team's AI should know what your team knows.             |
|                                                                        |
|                        [Start Trial with GitHub]                       |
|                                                                        |
|        +--------------------------------------------------+            |
|        |                                                  |            |
|        |     [Miniature terminal echo of hero]            |            |
|        |                                                  |            |
|        +--------------------------------------------------+            |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#18181B` |
| Padding | 128px vertical desktop, 96px mobile |
| Max content width | 800px |

### Badge

Same as hero badge:
- Text: "The first team memory layer for AI coding tools"
- Background: `rgba(245, 158, 11, 0.1)`
- Border: 1px solid `rgba(245, 158, 11, 0.3)`
- Text color: `#F59E0B`
- Padding: 8px 16px
- Border-radius: 9999px
- Entrance: fade + slide up, 600ms

### Headline

- Text: "Your team's AI should know what your team knows."
- Font: JetBrains Mono SemiBold 40px
- Color: `#FAFAF9`
- Text-align: center
- Max-width: 640px
- Margin: 32px auto 40px
- Entrance: fade + slide up, 600ms, delay 100ms

### CTA Button

Same as hero primary:
- Text: "Start Trial" with GitHub icon
- Background: `#FAFAF9`
- Color: `#0A0A0B`
- Padding: 16px 32px
- Border-radius: 4px
- Font: Inter SemiBold 18px
- Hover effects same as hero
- Entrance: fade + slide up, 600ms, delay 200ms

### Mini Terminal (Optional Enhancement)

A smaller, static echo of the hero terminal showing just the key moment:

**Container:**
- Max-width: 480px
- Margin: 48px auto 0
- Border: 1px solid `#27272A`
- Border-radius: 8px
- Background: `#0A0A0B`
- Padding: 16px
- Entrance: fade, 600ms, delay 400ms

**Content (static, no animation):**
```
$ cat .recall/context.md
# Team Context
- Auth uses Supabase (@devon, Nov 3)
- Don't use moment.js (breaks build)
```

- Font: JetBrains Mono 13px
- Prompt: `#22C55E`
- Output: `#A1A1AA`

---

## Section 9: Footer

### Layout

```
+------------------------------------------------------------------------+
|                                                                        |
|  recall                                                                |
|  Team memory for AI.                                                   |
|                                                                        |
|  Product        Company        Resources        Legal                  |
|  Features       About          Docs             Privacy                |
|  Pricing        Blog           Changelog        Terms                  |
|  Security       Contact        Status                                  |
|                                GitHub                                  |
|                                                                        |
|  ---------------------------------------------------------------       |
|                                                                        |
|  Made for developers who value their time.      [Twitter] [GitHub]     |
|                                                                        |
+------------------------------------------------------------------------+
```

### Section Specifications

| Property | Value |
|----------|-------|
| Background | `#0A0A0B` |
| Border-top | 1px solid `#27272A` |
| Padding | 64px horizontal, 80px top, 48px bottom |
| Max content width | 1200px |

### Logo Area

- Logo: "recall" in Space Grotesk Bold 24px
- Color: `#FAFAF9`
- Tagline: "Team memory for AI." in Inter Regular 15px `#71717A`
- Margin-bottom: 48px

### Link Columns

- Display: Grid
- Columns: 5 on desktop (logo + 4 link columns), 2 on mobile
- Gap: 48px desktop, 32px mobile

**Column Header:**
- Font: Inter SemiBold 14px
- Color: `#FAFAF9`
- Margin-bottom: 16px
- Text-transform: uppercase
- Letter-spacing: 0.05em

**Link:**
- Font: Inter Regular 15px
- Color: `#71717A`
- Margin-bottom: 12px
- Hover: Color `#FAFAF9`
- Transition: color 150ms

### Link Structure

| Product | Company | Resources | Legal |
|---------|---------|-----------|-------|
| Features | About | Docs | Privacy |
| Pricing | Blog | Changelog | Terms |
| Security | Contact | Status | |
| | | GitHub | |

### Bottom Bar

- Border-top: 1px solid `#27272A`
- Padding-top: 32px
- Margin-top: 48px
- Display: flex
- Justify: space-between
- Align: center

**Tagline:**
- Text: "Made for developers who value their time."
- Font: Inter Regular 14px
- Color: `#52525B`

**Social Icons:**
- Size: 20x20
- Color: `#52525B`
- Hover: `#FAFAF9`
- Gap: 16px
- Icons: Twitter (X), GitHub

---

## Animation Summary

### Page Load Sequence (Hero)

| Element | Delay | Duration | Effect |
|---------|-------|----------|--------|
| Badge | 0ms | 600ms | Fade + slide up 20px |
| Headline Line 1 | 100ms | 600ms | Fade + slide up 20px |
| Headline Line 2 | 200ms | 600ms | Fade + slide up 20px |
| Subheadline | 300ms | 600ms | Fade + slide up 20px |
| CTA Primary | 400ms | 600ms | Fade + slide up 20px |
| CTA Secondary | 450ms | 600ms | Fade + slide up 20px |
| Works With | 500ms | 600ms | Fade |
| Terminal | 700ms | 600ms | Fade + slide up 40px |
| Dissolve starts | 2000ms | 1500ms | See Phase 2 |
| Reconstruct | 4000ms | 1500ms | See Phase 4 |

### Scroll-Triggered Animations

All sections use `whileInView` with `viewport={{ once: true }}`:

- **Default entrance:** Fade + slide up 20px, 600ms, `ease-out`
- **Staggered lists:** 100-150ms delay between items
- **Cards:** Additional hover transforms

### Easing Curves (Framer Motion)

```typescript
const EASE_OUT = [0.16, 1, 0.3, 1];
const EASE_IN_OUT = [0.4, 0, 0.2, 1];
const SPRING = { type: "spring", stiffness: 400, damping: 25 };
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In code: Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and skip particle animations.

---

## Implementation Notes

### Font Loading Strategy

1. Use `font-display: swap` for all fonts
2. Preload critical fonts in `<head>`:
```html
<link rel="preload" href="/fonts/SpaceGrotesk-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/JetBrainsMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
```

### Performance Optimizations

1. **Canvas for particles:** Use a single `<canvas>` element for the dissolve effect
2. **Intersection Observer:** Lazy-load animations until sections enter viewport
3. **RequestAnimationFrame:** All continuous animations use rAF
4. **GPU layers:** Apply `will-change: transform` only during active animations

### Accessibility

1. All interactive elements have `:focus-visible` styles
2. Color contrast meets WCAG AA
3. Animations respect `prefers-reduced-motion`
4. Semantic HTML structure (proper heading hierarchy)
5. Skip link to main content

### Tailwind Configuration Updates

```typescript
// tailwind.config.ts additions
theme: {
  extend: {
    colors: {
      'bg-base': '#0A0A0B',
      'accent': '#F59E0B',
      'accent-glow': 'rgba(245, 158, 11, 0.4)',
      'decay-start': '#71717A',
      'decay-end': '#27272A',
    },
    fontFamily: {
      display: ['Space Grotesk', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
      sans: ['Inter', 'sans-serif'],
    },
    animation: {
      'dissolve': 'dissolve 800ms cubic-bezier(0.4, 0, 0.6, 1) forwards',
      'reconstruct': 'reconstruct 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
    },
  },
},
```

---

## File Structure

```
src/
  components/
    Header.tsx              # Updated with new styling
    Hero.tsx                # New dissolving animation
    HeroParticles.tsx       # Canvas particle system
    Problem.tsx             # Updated with counter
    Demo.tsx                # New comparison panels
    HowItWorks.tsx          # Updated with connecting line
    TrustSecurity.tsx       # Updated layout
    Pricing.tsx             # Updated styling
    FinalCTA.tsx            # Updated with mini terminal
    Footer.tsx              # Updated styling
  app/
    page.tsx                # Section composition
    globals.css             # Updated variables
  lib/
    animations.ts           # Shared animation configs
    particles.ts            # Particle system logic
```

---

## Checklist for Developers

- [ ] Update color palette in `tailwind.config.ts` and `globals.css`
- [ ] Install Space Grotesk, JetBrains Mono, Inter fonts
- [ ] Implement canvas particle system for dissolve effect
- [ ] Update Header with new styling and scroll behavior
- [ ] Build Hero with dissolving animation
- [ ] Add counter animation to Problem section
- [ ] Create Demo comparison panels
- [ ] Update HowItWorks with connecting line
- [ ] Update TrustSecurity layout
- [ ] Update Pricing card styling (amber accent)
- [ ] Update FinalCTA with mini terminal
- [ ] Update Footer styling
- [ ] Add noise texture overlay
- [ ] Test reduced motion preferences
- [ ] Test mobile responsiveness at all breakpoints
- [ ] Lighthouse performance audit (target: 90+)

---

*This specification is complete and build-ready. Developers should be able to implement without additional clarification.*
