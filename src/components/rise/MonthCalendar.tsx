import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/rise/visuals";
import { useRise } from "@/lib/store";
import { dayCompletion, dayKey, plansOn } from "@/lib/rise";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** One month at a glance: each day is shaded by how many habits were done, with a dot when plans exist. */
export function MonthCalendar() {
  const { state, today } = useRise();
  const [offset, setOffset] = useState(0);
  const first = startOfMonth(addMonths(today, offset));
  const count = endOfMonth(first).getDate();
  const blanks = (first.getDay() + 6) % 7;
  const days = Array.from({ length: count }, (_, i) => addDays(first, i));
  const todayKey = dayKey(today);
  const cells = days.map((d) => {
    const k = dayKey(d);
    const value = k <= todayKey ? dayCompletion(state, d) : null;
    return { d, k, value, plans: plansOn(state.tasks, k).length };
  });
  const perfect = cells.filter((c) => c.value === 100).length;

  return (
    <Panel title="Month" action={
      <div className="flex items-center gap-1">
        <button aria-label="Previous month" onClick={() => setOffset(offset - 1)} className="rounded-full border bg-card p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-28 text-center text-xs text-muted-foreground">{format(first, "MMMM yyyy")}</span>
        <button aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="rounded-full border bg-card p-1.5 hover:bg-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    }>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{w}</div>)}
        {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
        {cells.map(({ d, k, value, plans }) => (
          <div
            key={k}
            title={`${format(d, "MMM d")}${value === null ? "" : `: ${value}% of habits`}${plans ? `, ${plans} plan${plans > 1 ? "s" : ""}` : ""}`}
            className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs tabular-nums ${k === todayKey ? "ring-2 ring-primary/50" : ""} ${k > todayKey ? "text-muted-foreground/60" : (value ?? 0) >= 60 ? "text-primary-foreground" : ""}`}
            style={{ background: value ? `color-mix(in oklab, var(--primary) ${25 + value * 0.75}%, var(--heat-0))` : "var(--heat-0)" }}
          >
            {format(d, "d")}
            {plans > 0 && <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />}
            <span className="sr-only">{value === null ? "" : `${value}% of habits done`}{plans ? `, ${plans} plans` : ""}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          Less
          {[0, 30, 60, 100].map((v) => <span key={v} className="h-3 w-3 rounded-[3px]" style={{ background: v ? `color-mix(in oklab, var(--primary) ${25 + v * 0.75}%, var(--heat-0))` : "var(--heat-0)" }} />)}
          More
        </span>
        <span>{perfect} perfect {perfect === 1 ? "day" : "days"} · dot = plans</span>
      </div>
    </Panel>
  );
}
