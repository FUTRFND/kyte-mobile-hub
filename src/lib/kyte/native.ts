// Detects whether we're running inside a Capacitor native shell.
// Web preview/Lovable returns false → all native APIs become no-ops.
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error — injected by Capacitor on-device
  const cap = window.Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function nativePluginsDisabledForDiagnostics(): boolean {
  try {
    return import.meta.env.VITE_MOBILE_INPUT_DIAGNOSTIC === "1";
  } catch {
    return false;
  }
}
