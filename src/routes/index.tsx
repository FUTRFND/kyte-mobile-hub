import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [hold, setHold] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHold(false), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hold) return;
    let cancelled = false;
    (async () => {
      let session: unknown = null;
      try {
        const sessionPromise = supabase.auth.getSession().then((r) => r.data.session).catch(() => null);
        const timeout = new Promise<null>((res) => setTimeout(() => res(null), 1200));
        session = await Promise.race([sessionPromise, timeout]);
      } catch {
        session = null;
      }
      if (cancelled) return;
      try {
        if (session) {
          navigate({ to: "/app/home", replace: true });
        } else {
          const seen = typeof window !== "undefined" && localStorage.getItem("kyte.onboarded") === "1";
          navigate({ to: seen ? "/login" : "/onboarding", replace: true });
        }
      } catch (err) {
        console.error("[splash] navigate failed", err);
        navigate({ to: "/onboarding", replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [hold, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <KyteMark />
        <span className="font-display text-2xl font-bold tracking-tight text-foreground">Kyte</span>
      </div>
    </main>
  );
}

export function KyteMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-2xl bg-primary"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <path d="M5 4v16M5 12l9-8M5 12l9 8" stroke="#0B0B0D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
