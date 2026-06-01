import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Bell, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Kyte" }] }),
  component: Onboarding,
});

const slides = [
  {
    icon: CalendarDays,
    title: "Every bill, one calendar.",
    body: "See what's due, when — across every card and account.",
    accent: "from-[hsl(202_100%_55%)] to-[hsl(190_100%_65%)]",
  },
  {
    icon: Bell,
    title: "Reminders that actually help.",
    body: "Smart nudges before due dates. No late fees, no surprises.",
    accent: "from-[hsl(265_90%_65%)] to-[hsl(202_100%_55%)]",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade security.",
    body: "Read-only links via Teller. Tokens encrypted, never on device.",
    accent: "from-[hsl(150_70%_50%)] to-[hsl(190_100%_65%)]",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [mounted, setMounted] = useState(false);
  const last = i === slides.length - 1;
  const Slide = slides[i];
  const Icon = Slide.icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem("kyte.onboarded", "1");
    navigate({ to: "/login" });
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-6 safe-top safe-bottom">
      {/* Animated mesh background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-90" aria-hidden />
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float" aria-hidden />
      <div
        className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-float"
        style={{ animationDelay: "1.6s" }}
        aria-hidden
      />

      <div className="relative flex justify-between pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-bold text-foreground">Kyte</span>
        </div>
        <button onClick={finish} className="text-sm text-muted-foreground">Skip</button>
      </div>

      <div key={i} className="relative flex flex-1 flex-col items-center justify-center text-center animate-fade-in-up">
        <div
          className={`mb-10 grid h-24 w-24 place-items-center rounded-[28px] bg-gradient-to-br ${Slide.accent} text-primary-foreground shadow-glow ${mounted ? "animate-float" : ""}`}
        >
          <Icon className="h-10 w-10" strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight text-foreground">
          {Slide.title}
        </h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">{Slide.body}</p>
      </div>

      <div className="relative flex items-center justify-center gap-2 pb-6">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-8 bg-gradient-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="relative pb-6">
        <button
          onClick={() => (last ? finish() : setI(i + 1))}
          className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
        >
          {last ? "Get started" : "Continue"}
        </button>
      </div>
    </main>
  );
}
