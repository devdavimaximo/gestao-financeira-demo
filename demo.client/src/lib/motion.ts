import type { Variants, Transition, TargetAndTransition } from 'framer-motion';

// ── Timing tokens ─────────────────────────────────────────────────────────────

export const transitions = {
  /** Cards, panels — smooth deceleration */
  entrance: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } satisfies Transition,
  /** Page header — quick drop-in */
  fast: { duration: 0.28, ease: 'easeOut' } satisfies Transition,
  /** Spring for interactive elements */
  spring: { type: 'spring', stiffness: 300, damping: 24 } satisfies Transition,
  /** Chart bars — spring with slight overshoot */
  springChart: { type: 'spring', stiffness: 260, damping: 18 } satisfies Transition,
} as const;

// ── Shared variants ───────────────────────────────────────────────────────────

/** Fade + slide up — used for every card */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.entrance,
  },
};

/** Hero card variant — slightly more dramatic scale */
export const heroVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Page header drop-in */
export const headerVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/** Sidebar slide-in from left */
export const sidebarVariants: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Stagger container — wraps a list of cards */
export const staggerContainer = (staggerSecs = 0.065): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerSecs,
    },
  },
});

/** Page-level transition (fade + tiny slide) */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0,         transition: { duration: 0.18, ease: 'easeIn' } },
};

// ── Hover presets (used with whileHover) ──────────────────────────────────────

export const cardHover: TargetAndTransition = {
  y: -3,
  boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
  transition: { duration: 0.15, ease: 'easeOut' },
};

export const cardTap: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

// ── Reduced-motion guard ──────────────────────────────────────────────────────

/**
 * Returns empty variants when prefers-reduced-motion is active,
 * otherwise returns the given variants.
 */
export function safeVariants(
  variants: Variants,
  prefersReducedMotion: boolean,
): Variants {
  if (prefersReducedMotion) {
    return Object.fromEntries(
      Object.keys(variants).map(k => [k, { opacity: 1 }]),
    );
  }
  return variants;
}
