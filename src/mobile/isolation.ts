export function isMobileInputIsolationBuild(): boolean {
  try {
    return import.meta.env.VITE_MOBILE_INPUT_DIAGNOSTIC === "1";
  } catch {
    return false;
  }
}
