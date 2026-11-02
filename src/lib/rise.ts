import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";

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
  achievedAt?: string | undefined;
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

export function millisecondsUntilMidnight(now: Date) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function nameError(name: string, existing: string[]) {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a name.";
  if (trimmed.length > 120) return "Use 120 characters or fewer.";
  if (existing.some((n) => n.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return "That name already exists.";
  return "";
}

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
  const start = parseISO(h.createdAt);
  while (dayKey(d) >= dayKey(start)) {
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
    if (dayKey(d) < h.createdAt || !isScheduled(h, d)) continue;
    sched++;
    if (isDone(logs, h.id, dayKey(d))) done++;
  }
  return sched ? Math.round((done / sched) * 100) : 0;
}

/** Percent of scheduled habits completed on a given day. null if none scheduled. */
export function dayCompletion(state: RiseState, d: Date) {
  const k = dayKey(d);
  const sched = state.habits.filter((h) => isScheduled(h, d) && h.createdAt <= k);
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

export function weeklyScore(state: RiseState, today = new Date()) {
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const values = Array.from({ length: differenceInCalendarDays(today, start) + 1 }, (_, i) => dayCompletion(state, addDays(start, i))).filter((v): v is number => v !== null);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export function emptyState(): RiseState {
  return { habits: [], logs: {}, tasks: [], dreams: [] };
}

export function earnedBadges(state: RiseState, today = new Date()) {
  const maxBest = Math.max(0, ...state.habits.map((h) => bestStreak(h, state.logs, today)));
  const dates = new Set(Object.values(state.logs).flat().filter((k) => k <= dayKey(today)));
  const perfectDays = [...dates].filter((k) => dayCompletion(state, parseISO(k)) === 100).length;
  const tasksDone = state.tasks.filter((t) => t.done && t.date <= dayKey(today)).length;
  const achieved = state.dreams.filter((d) => d.achieved).length;
  return [
    { icon: "🔥", name: "7-day streak", earned: maxBest >= 7 },
    { icon: "🌋", name: "30-day streak", earned: maxBest >= 30 },
    { icon: "🌱", name: "First habit", earned: state.habits.length > 0 },
    { icon: "✨", name: "Perfect day", earned: perfectDays > 0 },
    { icon: "💎", name: "10 perfect days", earned: perfectDays >= 10 },
    { icon: "✅", name: "50 tasks done", earned: tasksDone >= 50 },
    { icon: "🏆", name: "First dream achieved", earned: achieved >= 1 },
    { icon: "🚀", name: "Dreamer", earned: state.dreams.length >= 5 },
  ].filter((b) => b.earned);
}
