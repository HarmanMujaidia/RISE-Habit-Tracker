import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/rise/visuals";
import { useRise } from "@/lib/store";
import { dayKey, weekKey, weekSummary } from "@/lib/rise";

/** A summary of one week plus a saved line about what went well. Weeks open on the current one. */
export function WeeklyReview() {
  const { state, today } = useRise();
  const [offset, setOffset] = useState(0);
  const thisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const start = addDays(thisWeek, offset * 7);
  const key = dayKey(start);
  const sum = weekSummary(state, start, today);
  const tiles = [
    { label: "Habits", value: `${sum.habitPct}%`, note: "avg completion" },
    { label: "Perfect days", value: String(sum.perfectDays), note: "all habits done" },
    { label: "Plans", value: `${sum.plansDone}/${sum.plansTotal}`, note: "completed" },
    { label: "Streak", value: String(sum.streak), note: "days in a row" },
  ];
  return (
    <Panel title="Weekly review" action={
      <div className="flex items-center gap-1">
        <button aria-label="Previous week" onClick={() => setOffset(offset - 1)} className="rounded-full border bg-card p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-28 text-center text-xs text-muted-foreground">{offset === 0 ? "This week" : `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d")}`}</span>
        <button aria-label="Next week" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="rounded-full border bg-card p-1.5 hover:bg-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    }>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border bg-card/50 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</div>
            <div className="mt-1 font-serif text-2xl">{t.value}</div>
            <div className="text-xs text-muted-foreground">{t.note}</div>
          </div>
        ))}
      </div>
      {sum.trips > 0 && <p className="mt-3 text-sm text-muted-foreground">{sum.trips === 1 ? "1 trip" : `${sum.trips} trips`} this week.</p>}
      {!sum.hasActivity && <p className="mt-3 text-sm text-muted-foreground">Nothing was tracked this week.</p>}
      <ReviewNote key={key} weekStart={key} />
    </Panel>
  );
}

function ReviewNote({ weekStart }: { weekStart: string }) {
  const { state, update } = useRise();
  const saved = state.reviews[weekStart] ?? "";
  const [text, setText] = useState(saved);
  const [shown, setShown] = useState(false);
  const latest = useRef(saved);
  latest.current = saved;

  useEffect(() => {
    if (text === latest.current) return;
    const timer = setTimeout(() => {
      update((s) => {
        const reviews = { ...s.reviews };
        if (text.trim()) reviews[weekStart] = text.trim(); else delete reviews[weekStart];
        return { ...s, reviews };
      });
      setShown(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [text, weekStart, update]);

  return (
    <div className="mt-4 space-y-1.5">
      <Label htmlFor={`review-${weekStart}`}>What went well this week?</Label>
      <Textarea id={`review-${weekStart}`} rows={2} maxLength={280} value={text} onChange={(e) => { setText(e.target.value); setShown(false); }} placeholder="One line is enough" />
      <p role="status" className="h-4 text-xs text-muted-foreground">{shown ? "Saved" : ""}</p>
    </div>
  );
}
