import { emptyState, type RiseState } from "./rise";
import { z } from "zod";

export const ENTRY_KEY = "rise-user-entries-v2";
export const LEGACY_KEY = "rise-state-v1";

const date = z.string().refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) && new Date(`${v}T12:00:00`).getDate() === Number(v.slice(-2)));
const entry = z.object({ id: z.string().min(1), title: z.string().min(1) });
const schema = z.object({
  habits: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), icon: z.string(), color: z.enum(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]), frequency: z.enum(["daily", "weekdays", "weekends"]), createdAt: date })),
  tasks: z.array(entry.extend({ date, time: z.string(), priority: z.enum(["low", "medium", "high"]), done: z.boolean() })),
  dreams: z.array(entry.extend({ description: z.string(), category: z.enum(["career", "health", "travel", "finance", "personal"]), targetDate: z.union([date, z.literal("")]), cover: z.string(), milestones: z.array(entry.extend({ done: z.boolean() })), achieved: z.boolean(), achievedAt: date.optional() })),
  logs: z.record(z.array(date)),
});

export function loadEntries(storage: Pick<Storage, "getItem" | "removeItem">): RiseState {
  try {
    storage.removeItem(LEGACY_KEY);
    const raw = storage.getItem(ENTRY_KEY);
    if (!raw) return emptyState();
    const result = schema.safeParse(JSON.parse(raw));
    if (!result.success) return emptyState();
    const value = result.data;
    const ids = new Set(value.habits.map((h) => h.id));
    return { ...value, logs: Object.fromEntries(Object.entries(value.logs).filter(([id]) => ids.has(id)).map(([id, days]) => [id, [...new Set(days)]])) };
  } catch {
    return emptyState();
  }
}

export function saveEntries(storage: Pick<Storage, "setItem" | "removeItem">, state: RiseState) {
  try {
    storage.removeItem(LEGACY_KEY);
    storage.setItem(ENTRY_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}