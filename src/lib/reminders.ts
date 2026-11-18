import { dayKey, isDone, isScheduled, type RiseState } from "./rise";

export interface ReminderSettings { plans: boolean; evening: boolean }
export interface Reminder { key: string; title: string; body: string }

export const REMINDER_KEY = "rise-reminders-v1";
const FIRED_KEY = "rise-reminders-fired-v1";
/** Plans are announced this many minutes before they start, and for 30 minutes after if the app was closed. */
export const LEAD_MINUTES = 10;
export const EVENING_HOUR = 20;
export const defaultReminders: ReminderSettings = { plans: false, evening: false };

export function loadReminders(storage: Pick<Storage, "getItem">): ReminderSettings {
  try {
    const raw = JSON.parse(storage.getItem(REMINDER_KEY) ?? "null") as Partial<ReminderSettings> | null;
    return { plans: raw?.plans === true, evening: raw?.evening === true };
  } catch {
    return defaultReminders;
  }
}

export function saveReminders(storage: Pick<Storage, "setItem">, settings: ReminderSettings) {
  try { storage.setItem(REMINDER_KEY, JSON.stringify(settings)); return true; } catch { return false; }
}

/** Reminders already shown today, so a reload never repeats one. */
export function loadFired(storage: Pick<Storage, "getItem">, day: string) {
  try {
    const raw = JSON.parse(storage.getItem(FIRED_KEY) ?? "null") as { day?: string; keys?: unknown } | null;
    if (raw?.day === day && Array.isArray(raw.keys)) return new Set(raw.keys.filter((k): k is string => typeof k === "string"));
  } catch { /* Start fresh. */ }
  return new Set<string>();
}

export function saveFired(storage: Pick<Storage, "setItem">, day: string, keys: Set<string>) {
  try { storage.setItem(FIRED_KEY, JSON.stringify({ day, keys: [...keys] })); } catch { /* Worst case a reminder repeats. */ }
}

/** What should be announced right now. Pure, so it can be tested. */
export function dueReminders(state: RiseState, now: Date, settings: ReminderSettings, fired: ReadonlySet<string>): Reminder[] {
  const day = dayKey(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const out: Reminder[] = [];
  if (settings.plans) {
    for (const t of state.tasks) {
      const m = /^(\d{2}):(\d{2})$/.exec(t.time);
      if (t.date !== day || t.done || !m) continue;
      const start = Number(m[1]) * 60 + Number(m[2]);
      const key = `plan:${t.id}:${day}`;
      if (minutes >= start - LEAD_MINUTES && minutes < start + 30 && !fired.has(key)) {
        out.push({ key, title: t.title, body: minutes >= start ? `Started at ${t.time}` : `Starts at ${t.time}` });
      }
    }
  }
  if (settings.evening && now.getHours() >= EVENING_HOUR) {
    const left = state.habits.filter((h) => h.createdAt <= day && isScheduled(h, now) && !isDone(state.logs, h.id, day));
    const key = `habits:${day}`;
    if (left.length && !fired.has(key)) out.push({ key, title: "Finish your day strong", body: left.length === 1 ? `${left[0]!.name} is still open today.` : `${left.length} habits are still open today.` });
  }
  return out;
}
