// ============================================================
// HelloAgain — Stark Theme Constants
// ============================================================

export const theme = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#0f1019',
      tertiary: '#141420',
      card: 'rgba(15, 16, 25, 0.8)',
      hover: 'rgba(0, 212, 255, 0.05)',
    },
    accent: {
      cyan: '#00d4ff',
      blue: '#0ea5e9',
      hotBlue: '#3b82f6',
      purple: '#8b5cf6',
    },
    text: {
      primary: '#f0f0f5',
      secondary: '#8a8a9a',
      muted: '#4a4a5a',
    },
    border: {
      default: 'rgba(0, 212, 255, 0.1)',
      hover: 'rgba(0, 212, 255, 0.3)',
      active: 'rgba(0, 212, 255, 0.6)',
    },
    glow: {
      cyan: '0 0 20px rgba(0, 212, 255, 0.3)',
      cyanStrong: '0 0 40px rgba(0, 212, 255, 0.5)',
      blue: '0 0 20px rgba(14, 165, 233, 0.3)',
    },
  },
  glass: {
    background: 'rgba(15, 16, 25, 0.6)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 212, 255, 0.1)',
  },
  font: {
    sans: "'Inter', 'Geist', system-ui, -apple-system, sans-serif",
    mono: "'Geist Mono', 'JetBrains Mono', monospace",
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
  },
} as const;
