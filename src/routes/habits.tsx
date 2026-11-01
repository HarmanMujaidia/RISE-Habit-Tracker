import { createFileRoute } from "@tanstack/react-router";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRise } from "@/lib/store";
import { bestStreak, colorVar, completionRate, currentStreak, dayKey, HABIT_COLORS, isDone, isScheduled, uid, type Frequency, type Habit } from "@/lib/rise";
import { PageHeader, Panel, ProgressRing } from "@/components/rise/visuals";

import { EmptyState } from "@/components/rise/EmptyState";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Habits — Rise" },
      { name: "description", content: "Build daily habits with streaks, completion rates and calendars." },
      { property: "og:title", content: "Habits — Rise" },
      { property: "og:description", content: "Build daily habits with streaks, completion rates and calendars." },
    ],
  }),
  component: HabitsPage,
});

const ICONS = ["🧘", "📚", "🏃", "💧", "✍️", "🥗", "😴", "🎸", "🌿", "💻", "🙏", "🚶"];

function HabitsPage() {
  const { state, update } = useRise();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(state.habits[0]?.id ?? null);
  const today = new Date();
  const tk = dayKey(today);

  const toggle = (id: string, key = tk) =>
    update((s) => {
      const l = s.logs[id] ?? [];
      return { ...s, logs: { ...s.logs, [id]: l.includes(key) ? l.filter((x) => x !== key) : [...l, key] } };
    });

  const save = (h: Habit) => {
    update((s) => ({ ...s, habits: s.habits.some((x) => x.id === h.id) ? s.habits.map((x) => (x.id === h.id ? h : x)) : [...s.habits, h] }));
    setSelected(h.id);
    setOpen(false);
  };
  const remove = (id: string) => {
    update((s) => {
      const logs = { ...s.logs };
      delete logs[id];
      return { ...s, habits: s.habits.filter((h) => h.id !== id), logs };
    });
    if (selected === id) setSelected(null);
  };

  const sel = state.habits.find((h) => h.id === selected) ?? state.habits[0];

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle="Tap to complete. Watch the streaks grow."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> New habit
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <AnimatePresence initial={false}>
            {state.habits.map((h) => {
              const done = isDone(state.logs, h.id, tk);
              const sched = isScheduled(h, today);
              const rate = completionRate(h, state.logs);
              return (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => setSelected(h.id)}
                  className={`surface flex cursor-pointer items-center gap-4 p-4 transition ${sel?.id === h.id ? "ring-2 ring-primary/40" : ""}`}
                >
                  <motion.button
                    whileTap={{ scale: 0.75 }}
                    disabled={!sched}
                    onClick={(e) => { e.stopPropagation(); toggle(h.id); }}
                    aria-label={`Complete ${h.name}`}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-xl transition disabled:opacity-40"
                    style={{ borderColor: colorVar(h.color), background: done ? colorVar(h.color) : "transparent" }}
                  >
                    <AnimatePresence mode="wait">
                      {done ? (
                        <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                          <Check className="h-6 w-6 text-primary-foreground" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <motion.span key="i" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>{h.icon}</motion.span>
                      )}
                    </AnimatePresence>
                    {done && (
                      <motion.span className="absolute inset-0 rounded-2xl" style={{ border: `2px solid ${colorVar(h.color)}` }} initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.6 }} />
                    )}
                  </motion.button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{h.name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>🔥 {currentStreak(h, state.logs)} streak</span>
                      <span>🏆 {bestStreak(h, state.logs)} best</span>
                      <span className="capitalize">{h.frequency}</span>
                    </div>
                  </div>
                  <ProgressRing value={rate} size={48} stroke={5} color={colorVar(h.color)} label={<span className="text-xs">{rate}%</span>} />
                  <div className="flex flex-col gap-1">
                    <button aria-label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(h); setOpen(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); remove(h.id); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!state.habits.length && <EmptyState message="No habits yet. Add your first habit to start your journey." label="Add habit" onClick={() => { setEditing(null); setOpen(true); }} />}
        </div>

        <div className="lg:col-span-2">
          {sel && <MonthCalendar habit={sel} onToggle={(k) => toggle(sel.id, k)} />}
        </div>
      </div>

      <HabitDialog open={open} onOpenChange={setOpen} initial={editing} onSave={save} />
    </div>
  );
}

function MonthCalendar({ habit, onToggle }: { habit: Habit; onToggle: (key: string) => void }) {
  const { state } = useRise();
  const [offset, setOffset] = useState(0);
  const month = addMonths(new Date(), offset);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = (getDay(startOfMonth(month)) + 6) % 7;
  const today = new Date();
  return (
    <Panel
      title={`${habit.icon} ${habit.name}`}
      action={
        <div className="flex items-center gap-1 text-sm">
          <button aria-label="Previous month" onClick={() => setOffset(offset - 1)} className="rounded-lg p-1 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-20 text-center text-muted-foreground">{format(month, "MMM yyyy")}</span>
          <button aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="rounded-lg p-1 hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`l${i}`} />)}
        {days.map((d) => {
          const k = dayKey(d);
          const done = isDone(state.logs, habit.id, k);
          const future = d > today || k < habit.createdAt;
          const sched = isScheduled(habit, d);
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.85 }}
              disabled={future || !sched}
              onClick={() => onToggle(k)}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs transition ${future || !sched ? "opacity-30" : "hover:ring-1 hover:ring-border"} ${k === dayKey(today) ? "ring-1 ring-foreground/30" : ""}`}
              style={{ background: done ? colorVar(habit.color) : "var(--heat-0)", color: done ? "var(--primary-foreground)" : undefined }}
            >
              {format(d, "d")}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          ["Streak", currentStreak(habit, state.logs)],
          ["Best", bestStreak(habit, state.logs)],
          ["30d rate", `${completionRate(habit, state.logs)}%`],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-muted p-3">
            <div className="font-serif text-xl">{v}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HabitDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initial: Habit | null; onSave: (h: Habit) => void }) {
  const blank: Habit = { id: "", name: "", icon: "🌿", color: "chart-1", frequency: "daily", createdAt: dayKey(new Date()) };
  const [h, setH] = useState<Habit>(blank);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setH(initial ?? { ...blank, id: uid() });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{initial ? "Edit habit" : "New habit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Habit name" value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            {ICONS.map((i) => (
              <button key={i} onClick={() => setH({ ...h, icon: i })} className={`h-10 w-10 rounded-xl text-lg transition ${h.icon === i ? "bg-accent ring-2 ring-primary" : "bg-muted"}`}>{i}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {HABIT_COLORS.map((c) => (
              <button key={c} aria-label={c} onClick={() => setH({ ...h, color: c })} className={`h-8 w-8 rounded-full transition ${h.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ background: colorVar(c) }} />
            ))}
          </div>
          <Select value={h.frequency} onValueChange={(v) => setH({ ...h, frequency: v as Frequency })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Every day</SelectItem>
              <SelectItem value="weekdays">Weekdays</SelectItem>
              <SelectItem value="weekends">Weekends</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!h.name.trim()} onClick={() => onSave({ ...h, name: h.name.trim() })} className="rounded-full">Save habit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
