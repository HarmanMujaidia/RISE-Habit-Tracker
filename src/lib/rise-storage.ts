import { emptyState, type RiseState } from "./rise";
import { z } from "zod";

export const ENTRY_KEY = "rise-user-entries-v2";
export const LEGACY_KEY = "rise-state-v1";
/** Set while this device holds changes the cloud has not received yet. */
export const PENDING_KEY = "rise-unsynced-v1";

const date = z.string().refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) && new Date(`${v}T12:00:00`).getDate() === Number(v.slice(-2)));
const entry = z.object({ id: z.string().min(1), title: z.string().min(1) });
const schema = z.object({
  habits: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), icon: z.string(), color: z.enum(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]), frequency: z.enum(["daily", "weekdays", "weekends"]), createdAt: date })),
  tasks: z.array(entry.extend({ date, time: z.string(), priority: z.enum(["low", "medium", "high"]), done: z.boolean(), kind: z.enum(["task", "meeting", "work", "travel", "personal"]).optional(), notes: z.string().optional(), from: z.string().optional(), destination: z.string().optional(), returnDate: z.union([date, z.literal("")]).optional(), seriesId: z.string().optional() })),
  dreams: z.array(entry.extend({ description: z.string(), category: z.enum(["career", "health", "travel", "finance", "personal"]), targetDate: z.union([date, z.literal("")]), cover: z.string(), milestones: z.array(entry.extend({ done: z.boolean() })), achieved: z.boolean(), achievedAt: date.optional() })),
  logs: z.record(z.array(date)),
  reviews: z.record(z.string().max(1000)).default({}),
});

/** Checks data from storage or the cloud. Returns null when it is not valid. */
export function parseState(raw: unknown): RiseState | null {
  const result = schema.safeParse(raw);
  if (!result.success) return null;
  const value = result.data;
  const ids = new Set(value.habits.map((h) => h.id));
  return { ...value, logs: Object.fromEntries(Object.entries(value.logs).filter(([id]) => ids.has(id)).map(([id, days]) => [id, [...new Set(days)]])) };
}

export function loadEntries(storage: Pick<Storage, "getItem" | "removeItem">): RiseState {
  try {
    storage.removeItem(LEGACY_KEY);
    const raw = storage.getItem(ENTRY_KEY);
    if (!raw) return emptyState();
    return parseState(JSON.parse(raw)) ?? emptyState();
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

/** The text of a backup file. */
export function exportBackup(state: RiseState, now = new Date()) {
  return JSON.stringify({ app: "rise", version: 1, exportedAt: now.toISOString(), data: state }, null, 2);
}

/** Reads a backup file's text. Returns null when it is not a valid Rise backup. */
export function parseBackup(text: string): RiseState | null {
  try {
    const raw: unknown = JSON.parse(text);
    const data = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
    return parseState(data);
  } catch {
    return null;
  }
}
