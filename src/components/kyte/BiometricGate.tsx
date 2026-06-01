import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { profileQuery } from "@/lib/kyte/queries";
import { biometricStatus, verifyBiometric } from "@/lib/kyte/biometric";
import { isNative } from "@/lib/kyte/native";

/**
 * Wraps children with a Face/Touch ID gate. If the user has biometric_enabled
 * and we're running on-device, render a lock screen until the user authenticates.
 * On web preview / when biometrics aren't available, this is a no-op.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { data: profile } = useQuery(profileQuery);
  const [unlocked, setUnlocked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    biometricStatus().then((s) => setAvailable(s === "available"));
  }, []);

  const required = isNative() && available && profile?.biometric_enabled === true;

  // Auto-prompt on mount once profile loads.
  useEffect(() => {
    if (!required || unlocked || tried) return;
    setTried(true);
    verifyBiometric("Unlock Kyte").then((ok) => {
      if (ok) setUnlocked(true);
    });
  }, [required, unlocked, tried]);

  if (!required || unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary">
        <ShieldCheck className="h-9 w-9 text-primary-foreground" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Kyte is locked</h1>
      <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
        Authenticate with Face ID or Touch ID to view your bills.
      </p>
      <button
        onClick={async () => {
          const ok = await verifyBiometric("Unlock Kyte");
          if (ok) setUnlocked(true);
        }}
        className="mt-8 flex h-14 items-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground active:opacity-90"
      >
        <Fingerprint className="h-5 w-5" /> Unlock
      </button>
    </div>
  );
}
