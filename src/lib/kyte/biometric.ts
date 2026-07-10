import { isNative, nativePluginsDisabledForDiagnostics } from "./native";

export type BiometricStatus = "unavailable" | "available" | "denied";

export async function biometricStatus(): Promise<BiometricStatus> {
  if (nativePluginsDisabledForDiagnostics()) return "unavailable";
  if (!isNative()) return "unavailable";
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    const res = await NativeBiometric.isAvailable();
    return res.isAvailable ? "available" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function verifyBiometric(reason = "Unlock Kyte"): Promise<boolean> {
  if (nativePluginsDisabledForDiagnostics()) return true;
  if (!isNative()) return true; // bypass on web preview
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Kyte",
      subtitle: "Authenticate to continue",
    });
    return true;
  } catch {
    return false;
  }
}
