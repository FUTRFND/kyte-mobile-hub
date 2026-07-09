// Mobile-only diagnostic layer. Persists the last unhandled error to
// localStorage so the NEXT app launch can surface it on-screen — the client
// screenshots the overlay instead of us guessing at a black WebView.
//
// Rules:
// - Never wipes React root once mounted.
// - Filters benign iOS WebView noise (keyboard focus / autofill / ResizeObserver).
// - Safe to import from web too; it's a no-op unless something is recorded.

const STORAGE_KEY = "kyte.diagnostics.lastError.v1";
const MAX_STACK = 4000;

export type DiagnosticRecord = {
  source: string;
  message: string;
  stack: string;
  timestamp: string;
  route: string;
  userAgent: string;
  buildVersion: string;
};

function benign(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    !m ||
    m === "null" ||
    m === "undefined" ||
    m.includes("resizeobserver") ||
    m.includes("non-error promise rejection") ||
    m.includes("script error") ||
    m.includes("load failed")
  );
}

function buildVersion(): string {
  try {
    return (
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_VERSION ||
      (import.meta as unknown as { env?: Record<string, string> }).env?.MODE ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function toRecord(source: string, err: unknown): DiagnosticRecord | null {
  const anyErr = err as { message?: unknown; stack?: unknown; reason?: unknown } | null | undefined;
  const raw =
    anyErr?.message ??
    (anyErr?.reason as { message?: unknown } | undefined)?.message ??
    anyErr?.reason ??
    err ??
    "Unknown error";
  const message = String(raw).slice(0, 1000);
  if (benign(message)) return null;
  const stack = String(
    anyErr?.stack ??
      (anyErr?.reason as { stack?: unknown } | undefined)?.stack ??
      "",
  ).slice(0, MAX_STACK);
  return {
    source,
    message,
    stack,
    timestamp: new Date().toISOString(),
    route: typeof location !== "undefined" ? location.pathname + location.search : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    buildVersion: buildVersion(),
  };
}

export function recordDiagnostic(source: string, err: unknown): void {
  try {
    const rec = toRecord(source, err);
    if (!rec) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function readDiagnostic(): DiagnosticRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosticRecord;
  } catch {
    return null;
  }
}

export function clearDiagnostic(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function installGlobalDiagnosticHandlers(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    if (benign(String(e.message || e.error?.message || ""))) return;
    recordDiagnostic("window.error", e.error ?? e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    if (benign(String((reason as { message?: string })?.message ?? reason ?? ""))) return;
    recordDiagnostic("unhandledrejection", reason);
  });
}
