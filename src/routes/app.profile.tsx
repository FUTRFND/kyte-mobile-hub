import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — Kyte" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <section className="px-6 pt-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account & preferences.</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <User2 className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{email ?? "Signed in"}</p>
          <p className="text-xs text-muted-foreground">Kyte account</p>
        </div>
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold text-destructive active:opacity-80"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </section>
  );
}
