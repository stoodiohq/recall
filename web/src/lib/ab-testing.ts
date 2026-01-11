// A/B Testing utility with cookie-based variant assignment

export type HeroVariant = 'A' | 'B' | 'C' | 'D';

const COOKIE_NAME = 'recall_hero_variant';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const heroVariants: Record<HeroVariant, {
  headline: string;
  headlineLine2: string;
  subhead: string;
  solution: string;
}> = {
  A: {
    headline: 'Your AI has amnesia.',
    headlineLine2: 'Your team keeps paying for it.',
    subhead: 'Every session starts from zero. Monday you explain your architecture. Tuesday your teammate explains it again. Wednesday, new session - you explain it again.',
    solution: 'Recall captures what your team learns and shares it across every session. What one developer teaches, every AI knows.',
  },
  B: {
    headline: 'Stop re-explaining your codebase.',
    headlineLine2: 'Every. Single. Session.',
    subhead: 'Your team has already solved these problems. Your AI just keeps forgetting.',
    solution: 'Recall captures decisions, patterns, and context automatically - then shares it across your whole team\'s AI sessions.',
  },
  C: {
    headline: 'Your team solves problems.',
    headlineLine2: 'Your AI forgets them.',
    subhead: 'Developers spend 15-20% of every AI session re-explaining context. That\'s thousands of dollars per year, per developer - wasted on repetition.',
    solution: 'Recall makes every AI session start with what your team already knows.',
  },
  D: {
    headline: 'The first team memory layer',
    headlineLine2: 'for AI coding tools.',
    subhead: 'What one developer teaches, every AI session knows.',
    solution: 'Your team\'s decisions, patterns, and context - automatically captured and shared across every AI coding session. No workflow changes. No files to maintain.',
  },
};

export function getVariantFromCookie(): HeroVariant | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME && ['A', 'B', 'C', 'D'].includes(value)) {
      return value as HeroVariant;
    }
  }
  return null;
}

export function setVariantCookie(variant: HeroVariant): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=${variant}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function assignVariant(): HeroVariant {
  // Check for existing cookie
  const existing = getVariantFromCookie();
  if (existing) return existing;

  // Randomly assign a variant (equal distribution)
  const variants: HeroVariant[] = ['A', 'B', 'C', 'D'];
  const randomIndex = Math.floor(Math.random() * variants.length);
  const variant = variants[randomIndex];

  // Store in cookie
  setVariantCookie(variant);

  return variant;
}

// For manual testing: add ?variant=A (or B, C, D) to URL to force a variant
export function getVariantFromURL(): HeroVariant | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const variant = params.get('variant')?.toUpperCase();

  if (variant && ['A', 'B', 'C', 'D'].includes(variant)) {
    return variant as HeroVariant;
  }
  return null;
}

export function getHeroVariant(): HeroVariant {
  // URL param overrides for testing
  const urlVariant = getVariantFromURL();
  if (urlVariant) {
    setVariantCookie(urlVariant); // Persist the override
    return urlVariant;
  }

  return assignVariant();
}
