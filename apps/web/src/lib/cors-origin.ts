export const APP_ORIGIN_PATTERN =
  /^(capacitor|ionic):\/\/localhost$|^https?:\/\/localhost(:\d+)?$/;

export function isAllowedAppOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return APP_ORIGIN_PATTERN.test(origin);
}
