import { Component, type ErrorInfo, type ReactNode } from "react";
import { recordDiagnostic } from "./diagnostics";

// React error boundary that records render/runtime errors to the diagnostic
// store, then re-renders children. We intentionally do NOT swap in a fallback
// tree here — the persisted record surfaces via <DiagnosticsOverlay /> on the
// next launch, and swapping trees mid-session tends to look like a crash on
// iOS. If a child truly cannot render, React will keep the last committed UI.
export class DiagnosticsBoundary extends Component<
  { children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordDiagnostic("react.render", {
      message: error.message,
      stack: `${error.stack ?? ""}\n\nComponent stack:${info.componentStack ?? ""}`,
    });
    // Reset so children re-render on the next tick — the persisted record is
    // what matters, not tearing down the UI.
    queueMicrotask(() => this.setState({ errored: false }));
  }

  render() {
    return this.props.children;
  }
}
