import { useEffect, useState } from "react";
import { formatMoney } from "./bills";

/**
 * Animated number that eases from 0 → value on mount/value change.
 * Uses requestAnimationFrame with a smooth cubic-out curve.
 */
export function AnimatedMoney({
  value,
  currency = "USD",
  className,
  duration = 1100,
}: {
  value: number;
  currency?: string;
  className?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = Number.isFinite(value) ? value : 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{formatMoney(shown, currency)}</span>;
}

/** SVG sparkline / area chart. Values can be any length. */
export function Sparkline({
  values,
  height = 56,
  className,
  stroke = "url(#sparkStroke)",
  fill = "url(#sparkFill)",
  showDots = false,
}: {
  values: number[];
  height?: number;
  className?: string;
  stroke?: string;
  fill?: string;
  showDots?: boolean;
}) {
  if (values.length < 2) {
    return <div style={{ height }} className={className} />;
  }
  const w = 100;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkStroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(202 100% 55%)" />
          <stop offset="100%" stopColor="hsl(265 90% 65%)" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(202 100% 55%)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(202 100% 55%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {showDots &&
        points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill="hsl(190 100% 65%)" />
        ))}
    </svg>
  );
}
