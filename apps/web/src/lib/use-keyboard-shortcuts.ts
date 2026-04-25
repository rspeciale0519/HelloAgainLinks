// apps/web/src/lib/use-keyboard-shortcuts.ts
'use client';

import { useEffect } from 'react';

export interface Shortcuts {
  /** ⌘K / Ctrl+K — open command palette */
  onPalette?: () => void;
  /** ⌘J — toggle Signal rail */
  onSignal?: () => void;
  /** ⌘B — toggle Index sidebar collapsed state */
  onNav?: () => void;
  /** Esc — close topmost modal/popover/selection */
  onEscape?: () => void;
}

/**
 * Global keyboard shortcuts for the HAL shell. Pass an object whose keys are
 * the handlers you care about; missing keys are no-ops.
 */
export function useKeyboardShortcuts(h: Shortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (meta && key === 'k') {
        e.preventDefault();
        h.onPalette?.();
      } else if (meta && key === 'j') {
        e.preventDefault();
        h.onSignal?.();
      } else if (meta && key === 'b') {
        e.preventDefault();
        h.onNav?.();
      } else if (e.key === 'Escape') {
        h.onEscape?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [h]);
}
