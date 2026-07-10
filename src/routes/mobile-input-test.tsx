import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type CSSProperties } from "react";

export const Route = createFileRoute("/mobile-input-test")({
  component: MobileInputTest,
});

type Snapshot = {
  focus: number;
  input: number;
  keydown: number;
  visualViewportResize: number;
  renderCount: number;
  lastHandler: string;
  lastValueLength: number;
  viewport: string;
};

function MobileInputTest() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);
  const snapshotRef = useRef<Snapshot>({
    focus: 0,
    input: 0,
    keydown: 0,
    visualViewportResize: 0,
    renderCount: 0,
    lastHandler: "render",
    lastValueLength: 0,
    viewport: viewportSummary(),
  });

  snapshotRef.current.renderCount += 1;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const write = (handler: string) => {
      snapshotRef.current.lastHandler = handler;
      snapshotRef.current.lastValueLength = input.value.length;
      snapshotRef.current.viewport = viewportSummary();
      if (outputRef.current) {
        outputRef.current.textContent = JSON.stringify(snapshotRef.current, null, 2);
      }
      console.info("[mobile-input-test]", snapshotRef.current);
    };

    const onFocus = () => {
      snapshotRef.current.focus += 1;
      write("focus");
    };
    const onInput = () => {
      snapshotRef.current.input += 1;
      write("input");
    };
    const onKeydown = () => {
      snapshotRef.current.keydown += 1;
      write("keydown");
    };
    const onVisualViewportResize = () => {
      snapshotRef.current.visualViewportResize += 1;
      write("visualViewport.resize");
    };

    input.addEventListener("focus", onFocus);
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeydown);
    window.visualViewport?.addEventListener("resize", onVisualViewportResize);
    write("mounted");

    return () => {
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeydown);
      window.visualViewport?.removeEventListener("resize", onVisualViewportResize);
    };
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <h1 style={styles.title}>iOS plain input test</h1>
        <input ref={inputRef} type="text" style={styles.input} />
        <pre ref={outputRef} style={styles.output} />
      </section>
    </main>
  );
}

function viewportSummary(): string {
  if (typeof window === "undefined") return "server";
  const vv = window.visualViewport;
  return JSON.stringify({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualWidth: vv?.width ?? null,
    visualHeight: vv?.height ?? null,
    offsetTop: vv?.offsetTop ?? null,
    scale: vv?.scale ?? null,
  });
}

const styles = {
  page: {
    minHeight: "100dvh",
    boxSizing: "border-box",
    padding: "max(24px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom))",
    background: "#0B0B0D",
    color: "#FFFFFF",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    maxWidth: 520,
    margin: "0 auto",
  },
  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    height: 56,
    borderRadius: 0,
    border: "2px solid #FFFFFF",
    background: "#FFFFFF",
    color: "#000000",
    fontSize: 20,
    lineHeight: "28px",
    padding: "10px 12px",
    outline: "none",
    WebkitAppearance: "none",
  },
  output: {
    margin: 0,
    minHeight: 220,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: "1px solid #3A3A3C",
    background: "#141416",
    color: "#D1FFDF",
    fontSize: 13,
    lineHeight: 1.45,
    padding: 12,
    overflow: "auto",
  },
} satisfies Record<string, CSSProperties>;
