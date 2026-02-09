'use client';

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNativeApp()) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // ignore on unsupported devices
  }
}
