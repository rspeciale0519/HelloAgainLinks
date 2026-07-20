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
    hex: '#a1fc2a',
    rgb: '161, 252, 42',
    dim: 'rgba(161, 252, 42, 0.15)',
    glow: 'rgba(161, 252, 42, 0.35)',
  },
  text: {
    0: '#f5f5f7',
    1: '#c9c9d0',
    2: '#7e7e88',
    3: '#50505a',
    4: '#2e2e36',
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
