import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export type Frequency = "daily" | "weekdays" | "weekends";
export type HabitColor = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
export type Priority = "low" | "medium" | "high";
export type Category = "career" | "health" | "travel" | "finance" | "personal";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: HabitColor;
  frequency: Frequency;
  createdAt: string;
}
export interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: Priority;
  done: boolean;
}
export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}
export interface Dream {
  id: string;
  title: string;
  description: string;
  category: Category;
  targetDate: string;
  cover: string;
  milestones: Milestone[];
  achieved: boolean;
  achievedAt?: string;
}
export interface RiseState {
  habits: Habit[];
  logs: Record<string, string[]>;
  tasks: Task[];
  dreams: Dream[];
}

export const HABIT_COLORS: HabitColor[] = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
export const CATEGORIES: Category[] = ["career", "health", "travel", "finance", "personal"];
export const colorVar = (c: HabitColor) => `var(--${c})`;

export const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
export const uid = () => Math.random().toString(36).slice(2, 10);

export function isScheduled(h: Habit, d: Date) {
  const wd = d.getDay();
  if (h.frequency === "weekdays") return wd >= 1 && wd <= 5;
  if (h.frequency === "weekends") return wd === 0 || wd === 6;
  return true;
}

export function isDone(logs: RiseState["logs"], id: string, key: string) {
  return logs[id]?.includes(key) ?? false;
}

export function currentStreak(h: Habit, logs: RiseState["logs"], today = new Date()) {
  let s = 0;
  let d = today;
  // today not yet done doesn't break the streak
  if (isScheduled(h, d) && !isDone(logs, h.id, dayKey(d))) d = addDays(d, -1);
  for (let i = 0; i < 730; i++) {
    if (isScheduled(h, d)) {
      if (isDone(logs, h.id, dayKey(d))) s++;
      else break;
    }
    d = addDays(d, -1);
  }
  return s;
}

export function bestStreak(h: Habit, logs: RiseState["logs"], today = new Date()) {
  const start = parseISO(h.createdAt);
  const days = differenceInCalendarDays(today, start);
  let best = 0;
  let run = 0;
  for (let i = 0; i <= days; i++) {
    const d = addDays(start, i);
    if (!isScheduled(h, d)) continue;
    if (isDone(logs, h.id, dayKey(d))) {
      run++;
      best = Math.max(best, run);
    } else if (dayKey(d) !== dayKey(today)) run = 0;
  }
  return best;
}

export function completionRate(h: Habit, logs: RiseState["logs"], days = 30, today = new Date()) {
  let sched = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (d < parseISO(h.createdAt) || !isScheduled(h, d)) continue;
    sched++;
    if (isDone(logs, h.id, dayKey(d))) done++;
  }
  return sched ? Math.round((done / sched) * 100) : 0;
}

/** Percent of scheduled habits completed on a given day. null if none scheduled. */
export function dayCompletion(state: RiseState, d: Date) {
  const k = dayKey(d);
  const sched = state.habits.filter((h) => isScheduled(h, d) && parseISO(h.createdAt) <= d);
  if (!sched.length) return null;
  const done = sched.filter((h) => isDone(state.logs, h.id, k)).length;
  return Math.round((done / sched.length) * 100);
}

export function dreamProgress(d: Dream) {
  if (d.achieved) return 100;
  if (!d.milestones.length) return 0;
  return Math.round((d.milestones.filter((m) => m.done).length / d.milestones.length) * 100);
}

export function taskScore(tasks: Task[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

/* ---------- Seed (deterministic so charts look full) ---------- */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function makeSeed(covers: Record<string, string>): RiseState {
  const today = new Date();
  const r = rng(42);
  const created = dayKey(addDays(today, -120));
  const habits: Habit[] = [
    { id: "h1", name: "Morning meditation", icon: "🧘", color: "chart-1", frequency: "daily", createdAt: created },
    { id: "h2", name: "Read 20 pages", icon: "📚", color: "chart-2", frequency: "daily", createdAt: created },
    { id: "h3", name: "Workout", icon: "🏃", color: "chart-4", frequency: "weekdays", createdAt: created },
    { id: "h4", name: "Drink 2L water", icon: "💧", color: "chart-3", frequency: "daily", createdAt: created },
    { id: "h5", name: "Journal", icon: "✍️", color: "chart-5", frequency: "daily", createdAt: created },
  ];
  const odds: Record<string, number> = { h1: 0.85, h2: 0.72, h3: 0.68, h4: 0.9, h5: 0.6 };
  const logs: RiseState["logs"] = {};
  for (const h of habits) {
    logs[h.id] = [];
    for (let i = 120; i >= 1; i--) {
      const d = addDays(today, -i);
      if (!isScheduled(h, d)) continue;
      // recent days slightly better = visible streaks
      const p = i < 12 ? Math.min(0.97, odds[h.id] + 0.2) : odds[h.id];
      if (r() < p) logs[h.id].push(dayKey(d));
    }
  }
  logs.h1.push(dayKey(today));
  logs.h4.push(dayKey(today));

  const titles = ["Deep work block", "Reply to emails", "Team sync", "Grocery run", "Plan next week", "Call mom", "Review budget", "Write blog draft", "Stretch session", "Read research paper"];
  const prios: Priority[] = ["low", "medium", "high"];
  const tasks: Task[] = [];
  for (let i = -30; i <= 2; i++) {
    const n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      tasks.push({
        id: `t${i}_${j}`,
        title: titles[Math.floor(r() * titles.length)],
        date: dayKey(addDays(today, i)),
        time: `${String(8 + j * 2 + Math.floor(r() * 2)).padStart(2, "0")}:${r() > 0.5 ? "00" : "30"}`,
        priority: prios[Math.floor(r() * 3)],
        done: i < 0 ? r() < 0.78 : i === 0 ? j < 2 : false,
      });
    }
  }

  const ms = (arr: string[], done: number): Milestone[] => arr.map((t, i) => ({ id: uid(), title: t, done: i < done }));
  const dreams: Dream[] = [
    { id: "d1", title: "Lead a product team", description: "Grow into a role where I shape products people love.", category: "career", targetDate: dayKey(addDays(today, 300)), cover: covers.career, milestones: ms(["Finish leadership course", "Mentor two juniors", "Ship a flagship feature", "Get promoted"], 2), achieved: false },
    { id: "d2", title: "Run a half marathon", description: "21km, steady and strong.", category: "health", targetDate: dayKey(addDays(today, 120)), cover: covers.health, milestones: ms(["Run 5k", "Run 10k", "Run 15k", "Race day"], 3), achieved: false },
    { id: "d3", title: "Spring in Kyoto", description: "Walk the old streets during cherry blossom season.", category: "travel", targetDate: dayKey(addDays(today, 160)), cover: covers.travel, milestones: ms(["Save travel fund", "Book flights", "Plan itinerary"], 1), achieved: false },
    { id: "d4", title: "Six-month safety net", description: "An emergency fund that lets me breathe.", category: "finance", targetDate: dayKey(addDays(today, -20)), cover: covers.finance, milestones: ms(["Track spending", "Automate savings", "Reach 6 months"], 3), achieved: true, achievedAt: dayKey(addDays(today, -20)) },
  ];
  return { habits, logs, tasks, dreams };
}
