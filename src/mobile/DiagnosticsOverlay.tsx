// On-screen diagnostic overlay. Rendered on top of the app on next launch
// when a persisted error record exists. High-contrast, iPhone-screenshot
// friendly. Non-blocking: user can dismiss or reload.
import { useEffect, useState } from "react";
import { clearDiagnostic, readDiagnostic, type DiagnosticRecord } from "./diagnostics";

export function DiagnosticsOverlay() {
  const [rec, setRec] = useState<DiagnosticRecord | null>(null);

  useEffect(() => {
    setRec(readDiagnostic());
  }, []);

  if (!rec) return null;

  const dismiss = () => {
    clearDiagnostic();
    setRec(null);
  };
  const reload = () => {
    clearDiagnostic();
    location.reload();
  };

  return (
    <div
      role="alertdialog"
      aria-label="Kyte runtime error detected"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.92)",
        color: "#fff",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        padding: "max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom)) 20px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: "#FF3B30",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Kyte runtime error detected
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "14px 0 4px" }}>
          {rec.message}
        </h1>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
          {rec.source} · {rec.timestamp}
        </div>

        <Field label="Route" value={rec.route || "(unknown)"} />
        <Field label="Build" value={rec.buildVersion} />
        <Field label="User agent" value={rec.userAgent} />

        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, margin: "16px 0 6px" }}>
          Stack trace
        </div>
        <pre
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 12,
            fontSize: 11,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "45vh",
            overflow: "auto",
            margin: 0,
            color: "#f5f5f5",
            fontFamily:
              "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace",
          }}
        >
          {rec.stack || "(no stack captured)"}
        </pre>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button
            onClick={reload}
            style={{
              flex: "1 1 140px",
              padding: "14px 18px",
              borderRadius: 12,
              background: "#0098FF",
              color: "#0B0B0D",
              fontWeight: 700,
              fontSize: 15,
              border: 0,
            }}
          >
            Reload app
          </button>
          <button
            onClick={dismiss}
            style={{
              flex: "1 1 140px",
              padding: "14px 18px",
              borderRadius: 12,
              background: "transparent",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              border: "1px solid #555",
            }}
          >
            Clear diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
