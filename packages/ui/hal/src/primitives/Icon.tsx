// packages/ui/hal/src/primitives/Icon.tsx
// Hairline stroke icons, 20px viewBox. Direct port of cp-icons.jsx from the
// design bundle, converted to TSX with a typed name union.

import type { CSSProperties, ReactElement } from 'react';

export type IconName =
  | 'search' | 'close' | 'chevron-r' | 'chevron-d' | 'chevron-l' | 'plus'
  | 'folder' | 'hash' | 'inbox' | 'star' | 'clock' | 'sparkle' | 'command'
  | 'bolt' | 'link' | 'eye' | 'heart' | 'repost' | 'reply' | 'bookmark'
  | 'archive' | 'check' | 'trash' | 'share' | 'filter' | 'sort' | 'grid'
  | 'list' | 'layers' | 'cpu' | 'signal' | 'at' | 'tag' | 'menu' | 'expand'
  | 'minimize' | 'copy' | 'external' | 'send' | 'users' | 'sliders' | 'radio'
  | 'quote';

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, stroke = 1.5, className, style }: IconProps): ReactElement | null {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
  };

  switch (name) {
    case 'search':    return <svg {...p}><circle cx="8.5" cy="8.5" r="5"/><path d="m15 15-2.5-2.5"/></svg>;
    case 'close':     return <svg {...p}><path d="M5 5l10 10M15 5 5 15"/></svg>;
    case 'chevron-r': return <svg {...p}><path d="m7 4 6 6-6 6"/></svg>;
    case 'chevron-d': return <svg {...p}><path d="m4 7 6 6 6-6"/></svg>;
    case 'chevron-l': return <svg {...p}><path d="m13 4-6 6 6 6"/></svg>;
    case 'plus':      return <svg {...p}><path d="M10 4v12M4 10h12"/></svg>;
    case 'folder':    return <svg {...p}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3l1.5 2h6.5A1.5 1.5 0 0 1 17 8.5v6A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-8z"/></svg>;
    case 'hash':      return <svg {...p}><path d="M6 3 4 17M14 3l-2 14M3 7h14M3 13h14"/></svg>;
    case 'inbox':     return <svg {...p}><path d="M3 10.5V15.5A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-5"/><path d="m3 10.5 2-6A1.5 1.5 0 0 1 6.5 3.5h7A1.5 1.5 0 0 1 15 4.5l2 6"/><path d="M3 10.5h4l1 2h4l1-2h4"/></svg>;
    case 'star':      return <svg {...p}><path d="m10 3 2.2 4.5 5 .7-3.6 3.5.8 5L10 14.4 5.6 16.7l.8-5L2.8 8.2l5-.7L10 3z"/></svg>;
    case 'clock':     return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/></svg>;
    case 'sparkle':   return <svg {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2.5 2.5M12.5 12.5 15 15M5 15l2.5-2.5M12.5 7.5 15 5"/></svg>;
    case 'command':   return <svg {...p}><path d="M6 6V5a1.5 1.5 0 1 0-1.5 1.5H6zm0 0h8m-8 0v8m0-8V6m8 0v1a1.5 1.5 0 1 0-1.5-1.5V6zm0 0v8m0 0h-8m8 0v1a1.5 1.5 0 1 0 1.5-1.5H14zm-8 0v1a1.5 1.5 0 1 1-1.5-1.5H6z"/></svg>;
    case 'bolt':      return <svg {...p}><path d="M11 2 4 11h5l-1 7 7-9h-5l1-7z"/></svg>;
    case 'link':      return <svg {...p}><path d="M8.5 11.5 11.5 8.5M7 13l-1 1a2.5 2.5 0 1 1-3.5-3.5l1-1m5-5 1-1a2.5 2.5 0 1 1 3.5 3.5l-1 1"/></svg>;
    case 'eye':       return <svg {...p}><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2"/></svg>;
    case 'heart':     return <svg {...p}><path d="M10 16s-6-3.5-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4.5-6 8-6 8z"/></svg>;
    case 'repost':    return <svg {...p}><path d="M4 8V6a2 2 0 0 1 2-2h8M16 12v2a2 2 0 0 1-2 2H6"/><path d="M2 8l2-4 2 4M18 12l-2 4-2-4"/></svg>;
    case 'reply':     return <svg {...p}><path d="M17 16c0-3-2-5-5-5H4m0 0 4-4m-4 4 4 4"/></svg>;
    case 'bookmark':  return <svg {...p}><path d="M5 3h10v14l-5-3-5 3V3z"/></svg>;
    case 'archive':   return <svg {...p}><path d="M3 6h14M4.5 6v10.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V6M8 10h4"/></svg>;
    case 'check':     return <svg {...p}><path d="m4 10 4 4 8-8"/></svg>;
    case 'trash':     return <svg {...p}><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6M9 9v5M11 9v5"/></svg>;
    case 'share':     return <svg {...p}><circle cx="5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="m7 9 6-3M7 11l6 3"/></svg>;
    case 'filter':    return <svg {...p}><path d="M3 5h14l-5 6v5l-4-2v-3L3 5z"/></svg>;
    case 'sort':      return <svg {...p}><path d="M6 4v12m0 0-2-2m2 2 2-2M14 16V4m0 0-2 2m2-2 2 2"/></svg>;
    case 'grid':      return <svg {...p}><rect x="3" y="3" width="6" height="6" rx="0.5"/><rect x="11" y="3" width="6" height="6" rx="0.5"/><rect x="3" y="11" width="6" height="6" rx="0.5"/><rect x="11" y="11" width="6" height="6" rx="0.5"/></svg>;
    case 'list':      return <svg {...p}><path d="M4 5h12M4 10h12M4 15h12"/></svg>;
    case 'layers':    return <svg {...p}><path d="m10 3 7 4-7 4-7-4 7-4z"/><path d="m3 13 7 4 7-4M3 10l7 4 7-4"/></svg>;
    case 'cpu':       return <svg {...p}><rect x="5" y="5" width="10" height="10" rx="1"/><rect x="7.5" y="7.5" width="5" height="5"/><path d="M3 8h2M3 12h2M15 8h2M15 12h2M8 3v2M12 3v2M8 15v2M12 15v2"/></svg>;
    case 'signal':    return <svg {...p}><path d="M3 14v2M7 11v5M11 7v9M15 3v13"/></svg>;
    case 'at':        return <svg {...p}><circle cx="10" cy="10" r="3"/><path d="M13 10v1.5a2 2 0 0 0 4 0v-1.5a7 7 0 1 0-3 5.75"/></svg>;
    case 'tag':       return <svg {...p}><path d="M3 3h6l8 8-6 6-8-8V3z"/><circle cx="6.5" cy="6.5" r="1"/></svg>;
    case 'menu':      return <svg {...p}><path d="M4 6h12M4 10h12M4 14h12"/></svg>;
    case 'expand':    return <svg {...p}><path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4"/></svg>;
    case 'minimize':  return <svg {...p}><path d="M8 4v4H4M12 4v4h4M8 16v-4H4M12 16v-4h4"/></svg>;
    case 'copy':      return <svg {...p}><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M13 7V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3"/></svg>;
    case 'external': return <svg {...p}><path d="M11 3h6v6M9 11l8-8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>;
    case 'send':      return <svg {...p}><path d="M17 3 3 10l5 2 2 5 7-14zM8 12l9-9"/></svg>;
    case 'users':     return <svg {...p}><circle cx="7" cy="7" r="3"/><path d="M2 16c0-2.5 2-4.5 5-4.5s5 2 5 4.5"/><circle cx="14" cy="8" r="2"/><path d="M18 15c0-2-1.5-3.5-4-3.5"/></svg>;
    case 'sliders':   return <svg {...p}><path d="M4 6h12M4 10h12M4 14h12"/><circle cx="8" cy="6" r="2" fill="var(--hal-bg-2)"/><circle cx="13" cy="10" r="2" fill="var(--hal-bg-2)"/><circle cx="7" cy="14" r="2" fill="var(--hal-bg-2)"/></svg>;
    case 'radio':     return <svg {...p}><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="5.5" opacity="0.5"/><circle cx="10" cy="10" r="8.5" opacity="0.25"/></svg>;
    case 'quote':     return <svg {...p}><path d="M4 10c0-3 2-5 4-5M4 10v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H4zm8 0c0-3 2-5 4-5m-4 5v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-3z"/></svg>;
    default: return null;
  }
}
