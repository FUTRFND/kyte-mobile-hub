// Kept as a no-op so historical call sites (native plugin gates,
// diagnostic route) stay compiling. The isolation build is permanently
// disabled — the full mobile app is always shipped.
export function isMobileInputIsolationBuild(): boolean {
  return false;
}
