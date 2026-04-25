// apps/web/src/lib/use-tweaks.ts
'use client';

import { useEffect, useState } from 'react';

export type Density = 'comfortable' | 'compact' | 'grid';
export type Layout = '2pane' | '3pane';
export type Pulse = 'on' | 'off';

export interface Tweaks {
  density: Density;
  layout: Layout;
  pulse: Pulse;
}

const DEFAULTS: Tweaks = { density: 'comfortable', layout: '3pane', pulse: 'on' };
const KEY = 'hal.tweaks.v1';

/**
 * Persist HAL UI preferences (density / layout / pulse) in localStorage.
 * Honors prefers-reduced-motion → pulse 'off' on first load when no value is
 * stored.
 */
export function useTweaks() {
  const [tweaks, setTweaksState] = useState<Tweaks>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Tweaks>;
        setTweaksState({ ...DEFAULTS, ...parsed });
      } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTweaksState((t) => ({ ...t, pulse: 'off' }));
      }
    } catch {
      /* ignore corrupt localStorage */
    }
  }, []);

  const setTweaks = (next: Tweaks | ((prev: Tweaks) => Tweaks)) => {
    setTweaksState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        /* no-op */
      }
      return value;
    });
  };

  return [tweaks, setTweaks] as const;
}
