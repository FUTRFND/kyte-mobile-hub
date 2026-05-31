import type { ComponentType, ReactNode } from "react";

export function TabPlaceholder({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  children?: ReactNode;
}) {
  return (
    <section className="px-6 pt-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-14 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-medium text-foreground">Coming in the next sprint</p>
        <p className="mt-1 text-xs text-muted-foreground">Sprint 1 ships the shell. Bills, calendar, insights next.</p>
        {children}
      </div>
    </section>
  );
}
