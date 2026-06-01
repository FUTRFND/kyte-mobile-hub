import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Bell, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Kyte" }] }),
  component: Onboarding,
});

const slides = [
  {
    icon: CalendarDays,
    title: "Every bill, one calendar.",
    body: "See what's due, when — across every card and account.",
  },
  {
    icon: Bell,
    title: "Reminders that actually help.",
    body: "Smart nudges before due dates. No late fees, no surprises.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade security.",
    body: "Read-only links via Teller. Tokens encrypted, never on device.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const Slide = slides[i];
  const Icon = Slide.icon;

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem("kyte.onboarded", "1");
    navigate({ to: "/login" });
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 safe-top safe-bottom">
      <div className="flex justify-end pt-4">
        <button onClick={finish} className="text-sm text-muted-foreground">Skip</button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-10 grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
          <Icon className="h-9 w-9" strokeWidth={1.8} />
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {Slide.title}
        </h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">{Slide.body}</p>
      </div>

      <div className="flex items-center justify-center gap-2 pb-6">
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-6 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="pb-6">
        <button
          onClick={() => (last ? finish() : setI(i + 1))}
          className="h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-90"
        >
          {last ? "Get started" : "Continue"}
        </button>
      </div>
    </main>
  );
}
