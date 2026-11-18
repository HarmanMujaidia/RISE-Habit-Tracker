import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, isToday, parseISO, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Briefcase, Check, ChevronLeft, ChevronRight, Heart, ListTodo, Pencil, Plane, Plus, Users, type LucideIcon } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRise } from "@/lib/store";
import { PLAN_KINDS, PLAN_LABEL, dayKey, nameError, planError, planKind, plansOn, taskScore, uid, type PlanKind, type Priority, type Task } from "@/lib/rise";
import { Bar, PageHeader, Panel, ProgressRing } from "@/components/rise/visuals";

import { EmptyState } from "@/components/rise/EmptyState";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Plans — Rise" },
      { name: "description", content: "Plan your week day by day: meetings, work, travel and tasks." },
      { property: "og:title", content: "Plans — Rise" },
      { property: "og:description", content: "Plan your week day by day: meetings, work, travel and tasks." },
    ],
  }),
  component: PlansPage,
});

const PRIO: Record<Priority, string> = { high: "var(--chart-4)", medium: "var(--chart-3)", low: "var(--chart-2)" };
const KIND_ICON: Record<PlanKind, LucideIcon> = { task: ListTodo, meeting: Users, work: Briefcase, travel: Plane, personal: Heart };

const shortDate = (k: string) => format(parseISO(k), "MMM d");

/** "Dubai → Delhi · back Nov 22" for a travel plan; empty for everything else. */
function travelLine(t: Task) {
  if (planKind(t) !== "travel") return "";
  const route = [t.from, t.destination].filter(Boolean).join(" → ");
  const back = t.returnDate && t.returnDate > t.date ? `back ${shortDate(t.returnDate)}` : "";
  return [route, back].filter(Boolean).join(" · ");
}

type PlanTarget = { task?: Task; date: string } | null;

function PlansPage() {
  const { state, update, today } = useRise();
  const [view, setView] = useState<"day" | "week">("week");
  const [date, setDate] = useState(() => new Date());
  const [dialog, setDialog] = useState<PlanTarget>(null);
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
  const dayPlans = plansOn(state.tasks, key);
  const score = taskScore(dayTasks);
  const movable = dayTasks.filter((t) => !t.done && planKind(t) !== "travel");

  const error = nameError(title, dayTasks.map((t) => t.title));
  const add = () => {
    if (error) return;
    const t: Task = { id: uid(), title: title.trim(), date: key, time: time || "09:00", priority: prio, done: false };
    update((s) => ({ ...s, tasks: [...s.tasks, t] }));
    setTitle("");
  };
  const toggle = (id: string) => update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  const moveUnfinished = () => {
    const next = dayKey(addDays(date, 1));
    update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.date === key && !t.done && planKind(t) !== "travel" ? { ...t, date: next } : t)) }));
  };

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayInWeek = weekDays.some((d) => dayKey(d) === dayKey(today));
  const addDate = view === "day" ? key : todayInWeek ? dayKey(today) : dayKey(weekStart);

  const save = (t: Task) => {
    update((s) => ({ ...s, tasks: s.tasks.some((x) => x.id === t.id) ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [...s.tasks, t] }));
    setDialog(null);
  };
  const remove = (id: string) => {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    setDialog(null);
  };

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Intentional days make meaningful years."
        action={
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
              <TabsList className="rounded-full">
                <TabsTrigger value="week" className="rounded-full">Week</TabsTrigger>
                <TabsTrigger value="day" className="rounded-full">Day</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button className="rounded-full" onClick={() => setDialog({ date: addDate })}><Plus className="mr-1 h-4 w-4" /> Add plan</Button>
          </div>
        }
      />

      <div className="mb-6 flex items-center justify-between gap-2">
        <button aria-label="Previous" onClick={() => setDate(addDays(date, view === "day" ? -1 : -7))} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center">
          <div className="font-serif text-xl">{view === "day" ? format(date, "EEEE, MMM d") : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`}</div>
          {(view === "day" ? !isToday(date) : !todayInWeek) && <button onClick={() => setDate(new Date())} className="text-xs text-primary">{view === "day" ? "Back to today" : "Back to this week"}</button>}
        </div>
        <button aria-label="Next" onClick={() => setDate(addDays(date, view === "day" ? 1 : 7))} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {view === "day" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input maxLength={120} aria-label="Task title" ref={taskInput} placeholder="Quick add a task" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="min-w-0 flex-1" />
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
                {dayPlans.map(({ task: t, continued }) => {
                  const Icon = KIND_ICON[planKind(t)];
                  const line = travelLine(t);
                  return (
                    <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className={`surface flex items-center gap-3 p-3 sm:p-4 ${continued ? "bg-muted/40" : ""}`}>
                      {continued ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground"><Icon className="h-4 w-4" /></span>
                      ) : (
                        <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggle(t.id)} role="checkbox" aria-checked={t.done} aria-label={`Complete ${t.title}`} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${t.done ? "border-primary bg-primary" : "border-border"}`}>
                          {t.done && <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />}
                        </motion.button>
                      )}
                      <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{continued ? "" : t.time}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`flex items-center gap-1.5 break-words text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
                          {!continued && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={PLAN_LABEL[planKind(t)]} />}
                          {t.title}
                        </span>
                        {(line || continued) && <span className="block break-words text-xs text-muted-foreground">{continued ? "Trip continues · " : ""}{line}</span>}
                        {t.notes && !continued && <span className="block break-words text-xs text-muted-foreground">{t.notes}</span>}
                      </span>
                      {!continued && (
                        <span className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ background: PRIO[t.priority] }} />
                          <span className="hidden sm:inline">{t.priority}</span>
                        </span>
                      )}
                      <button aria-label={`Edit ${t.title}`} onClick={() => setDialog({ task: t, date: t.date })} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!dayPlans.length && <EmptyState message="No plans yet. Add your first plan for this day." label="Add plan" onClick={() => taskInput.current?.focus()} />}
            </div>
          </div>
          <Panel title="Productivity">
            <div className="flex flex-col items-center gap-4">
              <ProgressRing value={score} size={150} stroke={12} sub="done" />
              <div className="text-sm text-muted-foreground">{dayTasks.filter((t) => t.done).length} of {dayTasks.length} plans</div>
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const ts = dayTasks.filter((t) => t.priority === p);
                return (
                  <div key={p} className="w-full">
                    <div className="mb-1 flex justify-between text-xs capitalize text-muted-foreground"><span>{p}</span><span>{ts.filter((t) => t.done).length}/{ts.length}</span></div>
                    <Bar value={taskScore(ts)} color={PRIO[p]} />
                  </div>
                );
              })}
              <Button variant="outline" className="mt-2 w-full rounded-full" disabled={!movable.length} onClick={moveUnfinished}>
                Move unfinished to tomorrow <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {weekDays.map((d) => {
            const k = dayKey(d);
            const ts = tasksFor(k);
            const plans = plansOn(state.tasks, k);
            return (
              <section key={k} aria-label={format(d, "EEEE, MMMM d")} className={`surface flex flex-col gap-3 p-4 ${isToday(d) ? "ring-2 ring-primary/40" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => { setDate(d); setView("day"); }} aria-label={`Open ${format(d, "EEEE")}`} className="text-left">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</div>
                    <div className="font-serif text-2xl">{format(d, "d")}</div>
                  </button>
                  <div className="flex items-center gap-2">
                    {ts.length > 0 && <ProgressRing value={taskScore(ts)} size={36} stroke={4} label={<span className="text-[10px]">{taskScore(ts)}</span>} />}
                    <button aria-label={`Add plan on ${format(d, "EEEE")}`} onClick={() => setDialog({ date: k })} className="rounded-full border bg-card p-1.5 text-muted-foreground transition hover:text-foreground"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {plans.map(({ task: t, continued }) => {
                    const Icon = KIND_ICON[planKind(t)];
                    const line = travelLine(t);
                    return (
                      <li key={t.id} className="flex items-start gap-2">
                        {continued ? (
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
                        ) : (
                          <button onClick={() => toggle(t.id)} role="checkbox" aria-checked={t.done} aria-label={`Complete ${t.title}`} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${t.done ? "border-primary bg-primary" : "border-border"}`}>
                            {t.done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </button>
                        )}
                        <button onClick={() => setDialog({ task: t, date: t.date })} aria-label={`Edit ${t.title}`} className={`min-w-0 flex-1 rounded-md text-left text-xs hover:text-primary ${continued ? "text-muted-foreground" : ""}`}>
                          <span className={`flex items-center gap-1 break-words text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
                            {!continued && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
                            {t.title}
                          </span>
                          <span className="block text-muted-foreground">
                            {continued ? `Trip continues${t.returnDate ? ` until ${shortDate(t.returnDate)}` : ""}` : t.time}
                            {!continued && line ? ` · ${line}` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {!plans.length && <li className="text-xs text-muted-foreground">Nothing planned</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="sr-only">{parseISO(key).toDateString()}</p>

      {dialog && <PlanDialog key={dialog.task?.id ?? `new-${dialog.date}`} task={dialog.task} defaultDate={dialog.date} all={state.tasks} onSave={save} onDelete={remove} onClose={() => setDialog(null)} />}
    </div>
  );
}

function PlanDialog({ task, defaultDate, all, onSave, onDelete, onClose }: { task?: Task | undefined; defaultDate: string; all: Task[]; onSave: (t: Task) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState<PlanKind>(task ? planKind(task) : "task");
  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(task?.date ?? defaultDate);
  const [time, setTime] = useState(task?.time ?? "09:00");
  const [prio, setPrio] = useState<Priority>(task?.priority ?? "medium");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [from, setFrom] = useState(task?.from ?? "");
  const [destination, setDestination] = useState(task?.destination ?? "");
  const [returnDate, setReturnDate] = useState(task?.returnDate ?? "");
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const travel = kind === "travel";
  // A trip without a title is called "Travel to <destination>".
  const finalTitle = title.trim() || (travel && destination.trim() ? `Travel to ${destination.trim()}` : "");
  const sameDay = all.filter((t) => t.id !== task?.id && t.date === date).map((t) => t.title);
  const error = planError({ kind, date, destination, returnDate }) || nameError(finalTitle, sameDay);

  const submit = () => {
    if (error) { setTried(true); return; }
    onSave({
      id: task?.id ?? uid(),
      title: finalTitle,
      date,
      time: time || "09:00",
      priority: prio,
      done: task?.done ?? false,
      kind,
      notes: notes.trim() || undefined,
      from: travel ? from.trim() || undefined : undefined,
      destination: travel ? destination.trim() : undefined,
      returnDate: travel && returnDate ? returnDate : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="font-serif text-2xl">{task ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <div role="radiogroup" aria-label="Plan type" className="flex flex-wrap gap-2">
            {PLAN_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              const on = k === kind;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setKind(k)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" /> {PLAN_LABEL[k]}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-title">Title</Label>
            <Input id="plan-title" maxLength={120} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={travel ? (destination.trim() ? `Travel to ${destination.trim()}` : "Flight home") : kind === "meeting" ? "Team meeting" : kind === "work" ? "Work on the project" : "What's the plan?"} />
          </div>

          {travel && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-from">From <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="plan-from" maxLength={80} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Dubai" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-to">Destination</Label>
                <Input id="plan-to" maxLength={80} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Delhi" />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-date">{travel ? "Departure date" : "Date"}</Label>
              <Input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {travel ? (
              <div className="space-y-1.5">
                <Label htmlFor="plan-return">Return date <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="plan-return" type="date" min={date || undefined} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="plan-time">{travel ? "Departure time" : "Time"}</Label>
              <Input id="plan-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-priority">Priority</Label>
              <Select value={prio} onValueChange={(v) => setPrio(v as Priority)}>
                <SelectTrigger id="plan-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="plan-notes" maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={travel ? "Flight number, hotel, packing…" : "Anything to remember"} />
          </div>

          {tried && error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="items-center gap-2 sm:justify-between">
            {task ? (
              confirming ? (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" className="text-destructive" onClick={() => onDelete(task.id)}>Yes, delete</Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>Delete</Button>
              )
            ) : <span />}
            <Button type="submit" className="rounded-full">{task ? "Save changes" : "Add plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
