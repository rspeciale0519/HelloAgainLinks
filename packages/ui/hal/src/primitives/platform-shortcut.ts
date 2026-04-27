// packages/ui/hal/src/primitives/platform-shortcut.ts
//
// Small helper for rendering keyboard shortcut hints with both Mac and
// Windows/Linux variants. Returns a static dual-string by default
// (e.g. "⌘K / Ctrl+K") so SSR is deterministic — the user wants both
// variants visible regardless of platform.

export interface ShortcutOptions {
  /**
   * When true, render only the variant matching the current platform
   * instead of the dual string. Useful for narrow status-bar slots.
   * Default false (always show both).
   */
  platformOnly?: boolean;
}

const MAC_KEY = '⌘'; // ⌘
const SHIFT = '⇧'; // ⇧
const ENTER = '↵'; // ↵

export function macModifier(): string {
  return MAC_KEY;
}

/**
 * Format a single-letter shortcut as a dual Mac/Windows hint, e.g.
 * `formatShortcut('K')` → "⌘K / Ctrl+K".
 */
export function formatShortcut(letter: string, opts: ShortcutOptions = {}): string {
  const upper = letter.toUpperCase();
  if (opts.platformOnly && isMacPlatform()) return `${MAC_KEY}${upper}`;
  if (opts.platformOnly) return `Ctrl+${upper}`;
  return `${MAC_KEY}${upper} / Ctrl+${upper}`;
}

/**
 * Format a Shift+letter shortcut, e.g. `formatShiftShortcut('Enter')` →
 * "⇧↵ / Shift+Enter".
 */
export function formatShiftShortcut(key: 'Enter' | string): string {
  if (key === 'Enter') return `${SHIFT}${ENTER} / Shift+Enter`;
  return `${SHIFT}${key.toUpperCase()} / Shift+${key.toUpperCase()}`;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  // navigator.userAgentData.platform is the modern API, navigator.platform the
  // fallback. Check both.
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
      ?.platform || navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}
