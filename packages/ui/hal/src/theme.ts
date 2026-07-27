// packages/ui/hal/src/theme.ts
// Obsidian canvas + electric lime accent — the de-slopped HAL identity.
// CSS variables are the source of truth at runtime; this TS module mirrors them
// for type-safe token reads from JS code (e.g., computing contrast at runtime).

export const halTheme = {
  bg: {
    0: '#050506',
    1: '#0a0a0c',
    2: '#111114',
    3: '#17171c',
    4: '#1f1f26',
    5: '#292930',
  },
  accent: {
    hex: '#00d4ff',
    rgb: '0, 212, 255',
    dim: 'rgba(0, 212, 255, 0.15)',
    glow: 'rgba(0, 212, 255, 0.35)',
  },
  // Keep in step with --hal-text-* in styles/globals.css. Contrast against
  // bg-1; 2/3 raised to clear WCAG AA (were 4.7:1 and 2.5:1), 4 is
  // decorative/disabled only.
  text: {
    0: '#f5f5f7',
    1: '#c9c9d0',
    2: '#9a9aa6',
    3: '#8a8a96',
    4: '#7e7e8c',
  },
  line: {
    0: 'rgba(255, 255, 255, 0.04)',
    1: 'rgba(255, 255, 255, 0.07)',
    2: 'rgba(255, 255, 255, 0.12)',
  },
  font: {
    sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
    serif: "'Instrument Serif', 'Times New Roman', serif",
  },
} as const;

export type HalTheme = typeof halTheme;
