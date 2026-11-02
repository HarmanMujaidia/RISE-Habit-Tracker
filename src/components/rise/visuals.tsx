import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { addDays, format, startOfWeek } from "date-fns";
import type { ReactNode } from "react";

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  color = "var(--primary)",
  label,
  sub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
  sub?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (safeValue / 100) * c }}
          transition={{ duration: reduced ? 0 : 0.24, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-tight">
        <span className="font-serif text-lg font-semibold">{label ?? `${Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0}%`}</span>
        {sub && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export function Bar({ value, color = "var(--primary)", className = "h-2" }: { value: number; color?: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0}%` }}
        transition={{ duration: reduced ? 0 : 0.24, ease: "easeOut" }}
      />
    </div>
  );
}

/** GitHub-style heatmap. getValue returns 0..100 or null. */
export function Heatmap({ weeks = 18, getValue, color = "var(--primary)" }: { weeks?: number; getValue: (d: Date) => number | null; color?: string }) {
  const today = new Date();
  const start = startOfWeek(addDays(today, -(weeks - 1) * 7), { weekStartsOn: 1 });
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((d) => {
              const future = d > today;
              const v = future ? null : getValue(d);
              const bg = v == null || v === 0 ? "var(--heat-0)" : `color-mix(in oklab, ${color} ${25 + v * 0.75}%, var(--heat-0))`;
              return (
                <div
                  key={d.toISOString()}
                  title={`${format(d, "MMM d")}: ${v ?? "–"}%`}
                  className="aspect-square w-full rounded-[2px]"
                  style={{ background: bg, opacity: future ? 0.3 : 1 }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Celebration({ show }: { show: boolean }) {
  const reduced = useReducedMotion();
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {Array.from({ length: reduced ? 0 : 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const dist = 160 + (i % 5) * 50;
            return (
              <motion.span
                key={i}
                className="absolute h-3 w-2 rounded-sm"
                style={{ background: colors[i % 5] }}
                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist + 80, scale: 1, rotate: 360, opacity: [1, 1, 0] }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              />
            );
          })}
          <motion.div
            className="surface px-8 py-5 text-center"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div className="text-4xl">🌟</div>
            <div className="mt-1 font-serif text-2xl">Dream achieved</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:mb-8 sm:flex sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`surface min-w-0 p-5 sm:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          {title && <h3 className="min-w-0 break-words text-lg font-medium">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  cursor: { fill: "var(--muted)" },
};
