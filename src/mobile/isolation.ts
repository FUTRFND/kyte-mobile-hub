export function isMobileInputIsolationBuild(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env;
    return env?.VITE_MOBILE_INPUT_DIAGNOSTIC === "1" || env?.VITE_MOBILE_INPUT_DIAGNOSTIC === true;
  } catch {
    return false;
  }
}
