import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, isToday, parseISO, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRise } from "@/lib/store";
import { dayKey, nameError, taskScore, uid, type Priority, type Task } from "@/lib/rise";
import { Bar, PageHeader, Panel, ProgressRing } from "@/components/rise/visuals";

import { EmptyState } from "@/components/rise/EmptyState";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Daily Plans — Rise" },
      { name: "description", content: "Plan your day with timed, prioritized tasks and a productivity score." },
      { property: "og:title", content: "Daily Plans — Rise" },
      { property: "og:description", content: "Plan your day with timed, prioritized tasks and a productivity score." },
    ],
  }),
  component: PlansPage,
});

const PRIO: Record<Priority, string> = { high: "var(--chart-4)", medium: "var(--chart-3)", low: "var(--chart-2)" };

function PlansPage() {
  const { state, update, today } = useRise();
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(() => new Date());
  const taskInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [prio, setPrio] = useState<Priority>("medium");
  const previousToday = useRef(dayKey(today));
  useEffect(() => {
    const next = dayKey(today);
    if (next !== previousToday.current) {
      const previous = previousToday.current;
      setDate((d) => dayKey(d) === previous ? today : d);
      previousToday.current = next;
    }
  }, [today]);
  const key = dayKey(date);

  const tasksFor = (k: string) => state.tasks.filter((t) => t.date === k).sort((a, b) => a.time.localeCompare(b.time));
  const dayTasks = tasksFor(key);
  const score = taskScore(dayTasks);

  const error = nameError(title, dayTasks.map((t) => t.title));
  const add = () => {
    if (error) return;
    const t: Task = { id: uid(), title: title.trim(), date: key, time, priority: prio, done: false };
    update((s) => ({ ...s, tasks: [...s.tasks, t] }));
    setTitle("");
  };
  const toggle = (id: string) => update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  const remove = (id: string) => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  const moveUnfinished = () => {
    const next = dayKey(addDays(date, 1));
    update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.date === key && !t.done ? { ...t, date: next } : t)) }));
  };

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <PageHeader
        title="Daily Plans"
        subtitle="Intentional days make meaningful years."
        action={
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
            <TabsList className="rounded-full">
              <TabsTrigger value="day" className="rounded-full">Day</TabsTrigger>
              <TabsTrigger value="week" className="rounded-full">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mb-6 flex items-center justify-between gap-2">
        <button aria-label="Previous" onClick={() => setDate(addDays(date, view === "day" ? -1 : -7))} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center">
          <div className="font-serif text-xl">{view === "day" ? format(date, "EEEE, MMM d") : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`}</div>
          {!isToday(date) && <button onClick={() => setDate(new Date())} className="text-xs text-primary">Back to today</button>}
        </div>
        <button aria-label="Next" onClick={() => setDate(addDays(date, view === "day" ? 1 : 7))} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {view === "day" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input maxLength={120} aria-label="Task title" ref={taskInput} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="min-w-0 flex-1" />
                <div className="flex gap-2">
                  <Input aria-label="Task time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="min-w-0 w-24 sm:w-28" />
                  <Select value={prio} onValueChange={(v) => setPrio(v as Priority)}>
                    <SelectTrigger className="min-w-0 w-24 sm:w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button disabled={!!error} onClick={add} size="icon" aria-label="Add task" className="shrink-0 rounded-full"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              {title.trim() && error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
            </Panel>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {dayTasks.map((t) => (
                  <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="surface flex items-center gap-3 p-3 sm:p-4">
                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggle(t.id)} role="checkbox" aria-checked={t.done} aria-label={`Complete ${t.title}`} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${t.done ? "border-primary bg-primary" : "border-border"}`}>
                      {t.done && <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />}
                    </motion.button>
                    <span className="shrink-0 w-12 text-sm tabular-nums text-muted-foreground">{t.time}</span>
                    <span className={`min-w-0 flex-1 break-words text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                    <span className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: PRIO[t.priority] }} />
                      <span className="hidden sm:inline">{t.priority}</span>
                    </span>
                    <button aria-label="Delete" onClick={() => remove(t.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!dayTasks.length && <EmptyState message="No plans yet. Add your first task for this day." label="Add plan" onClick={() => taskInput.current?.focus()} />}
            </div>
          </div>
          <Panel title="Productivity">
            <div className="flex flex-col items-center gap-4">
              <ProgressRing value={score} size={150} stroke={12} sub="done" />
              <div className="text-sm text-muted-foreground">{dayTasks.filter((t) => t.done).length} of {dayTasks.length} tasks</div>
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const ts = dayTasks.filter((t) => t.priority === p);
                return (
                  <div key={p} className="w-full">
                    <div className="mb-1 flex justify-between text-xs capitalize text-muted-foreground"><span>{p}</span><span>{ts.filter((t) => t.done).length}/{ts.length}</span></div>
                    <Bar value={taskScore(ts)} color={PRIO[p]} />
                  </div>
                );
              })}
              <Button variant="outline" className="mt-2 w-full rounded-full" disabled={!dayTasks.some((t) => !t.done)} onClick={moveUnfinished}>
                Move unfinished to tomorrow <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {weekDays.map((d) => {
            const ts = tasksFor(dayKey(d));
            return (
              <button key={d.toISOString()} onClick={() => { setDate(d); setView("day"); }} className={`surface flex flex-col gap-3 p-4 text-left transition hover:shadow-lift ${isToday(d) ? "ring-2 ring-primary/40" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</div>
                    <div className="font-serif text-2xl">{format(d, "d")}</div>
                  </div>
                  <ProgressRing value={taskScore(ts)} size={40} stroke={4} label={<span className="text-[10px]">{taskScore(ts)}</span>} />
                </div>
                <div className="space-y-1">
                  {ts.slice(0, 4).map((t) => (
                    <div key={t.id} className={`truncate text-xs ${t.done ? "text-muted-foreground line-through" : ""}`}>
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PRIO[t.priority] }} />
                      {t.title}
                    </div>
                  ))}
                  {ts.length > 4 && <div className="text-xs text-muted-foreground">+{ts.length - 4} more</div>}
                  {!ts.length && <div className="text-xs text-muted-foreground">—</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="sr-only">{parseISO(key).toDateString()}</p>
    </div>
  );
}
