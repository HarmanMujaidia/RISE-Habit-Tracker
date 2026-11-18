import { describe, expect, it } from "vitest";
import { bestStreak, completionRate, currentStreak, dayCompletion, dreamProgress, earnedBadges, emptyState, taskScore, weeklyScore, millisecondsUntilMidnight, nameError, dayKey, planEnd, planError, plansOn, repeatWeekly, type Habit, type Task } from "@/lib/rise";
import { dueReminders, loadReminders, defaultReminders } from "@/lib/reminders";
import { ENTRY_KEY, LEGACY_KEY, loadEntries, parseState, saveEntries } from "@/lib/rise-storage";

const today = new Date(2026, 10, 6, 12);
const habit: Habit = { id: "real-habit", name: "My habit", icon: "🌿", color: "chart-1", frequency: "daily", createdAt: "2026-11-01" };

describe("Real progress only", () => {
  it("starts with no entries, completions or badges and zero scores", () => {
    const s = emptyState();
    expect(s).toEqual({ habits: [], logs: {}, tasks: [], dreams: [] });
    expect(dayCompletion(s, today) ?? 0).toBe(0);
    expect(taskScore(s.tasks)).toBe(0);
    expect(earnedBadges(s, today)).toEqual([]);
  });
  it("starts a streak only on completion", () => {
    expect(currentStreak(habit, {}, today)).toBe(0);
    expect(currentStreak(habit, { [habit.id]: ["2026-11-06"] }, today)).toBe(1);
  });
  it("starts weekly score at zero and counts only applicable days", () => {
    expect(weeklyScore(emptyState(), today)).toBe(0);
    const h = { ...habit, createdAt: "2026-11-06" };
    expect(weeklyScore({ ...emptyState(), habits: [h], logs: { [h.id]: ["2026-11-06"] } }, today)).toBe(100);
  });
  it("breaks a streak when yesterday was missed", () => {
    expect(currentStreak(habit, { [habit.id]: ["2026-11-03", "2026-11-04"] }, today)).toBe(0);
    expect(bestStreak(habit, { [habit.id]: ["2026-11-03", "2026-11-04"] }, today)).toBe(2);
  });
  it("does not break on an unfinished current day", () => {
    expect(currentStreak(habit, { [habit.id]: ["2026-11-04", "2026-11-05"] }, today)).toBe(2);
  });
  it("ignores unscheduled days in streaks", () => {
    const weekday = { ...habit, frequency: "weekdays" as const };
    expect(currentStreak(weekday, { [habit.id]: ["2026-11-06", "2026-11-09"] }, new Date(2026, 10, 9, 12))).toBe(2);
  });
  it("counts the creation day in completion rates", () => {
    const h = { ...habit, createdAt: "2026-11-06" };
    expect(completionRate(h, { [h.id]: ["2026-11-06"] }, 30, today)).toBe(100);
    expect(dayCompletion({ ...emptyState(), habits: [h], logs: { [h.id]: ["2026-11-06"] } }, today)).toBe(100);
  });
  it("calculates scores only from actual completions", () => {
    const s = { ...emptyState(), habits: [habit], logs: {} };
    expect(dayCompletion(s, today)).toBe(0);
    expect(earnedBadges(s, today).map((b) => b.name)).toEqual(["First habit"]);
    s.logs = { [habit.id]: ["2026-11-06"] };
    expect(dayCompletion(s, today)).toBe(100);
    expect(earnedBadges(s, today).map((b) => b.name)).toContain("Perfect day");
    expect(taskScore([{ id: "task", title: "My task", date: "2026-11-06", time: "09:00", priority: "low", done: false }])).toBe(0);
    expect(taskScore([{ id: "task", title: "My task", date: "2026-11-06", time: "09:00", priority: "low", done: true }])).toBe(100);
  });
  it("calculates dream progress from actual milestones or explicit achievement", () => {
    const d = { id: "dream", title: "My dream", description: "", category: "personal" as const, targetDate: "", cover: "", milestones: [], achieved: false };
    expect(dreamProgress(d)).toBe(0);
    expect(dreamProgress({ ...d, milestones: [{ id: "1", title: "Step", done: true }, { id: "2", title: "Next", done: false }] })).toBe(50);
    expect(dreamProgress({ ...d, achieved: true })).toBe(100);
  });
});

describe("Browser entry migration", () => {
  it("rejects damaged nested entries without crashing", () => {
    localStorage.setItem(ENTRY_KEY, JSON.stringify({ ...emptyState(), dreams: [{ id: "bad", title: "Damaged" }] }));
    expect(loadEntries(localStorage)).toEqual(emptyState());
  });
  it("handles unavailable storage without crashing", () => {
    const blocked = { removeItem: () => { throw new Error("blocked"); }, getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadEntries(blocked)).toEqual(emptyState());
    expect(saveEntries(blocked, emptyState())).toBe(false);
  });
  it("discards legacy demo storage and starts empty", () => {
    localStorage.clear();
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ habits: [{ id: "h1" }] }));
    expect(loadEntries(localStorage)).toEqual(emptyState());
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
  it("retains real entries after reload", () => {
    const s = { ...emptyState(), habits: [habit] };
    saveEntries(localStorage, s);
    expect(loadEntries(localStorage)).toEqual(s);
  });
  it("resets every entry and completion without regenerating data", () => {
    saveEntries(localStorage, { ...emptyState(), habits: [habit], logs: { [habit.id]: ["2026-11-06"] } });
    saveEntries(localStorage, emptyState());
    expect(loadEntries(localStorage)).toEqual(emptyState());
  });
  it("recovers malformed storage to an empty state", () => {
    localStorage.setItem(ENTRY_KEY, "not-json");
    expect(loadEntries(localStorage)).toEqual(emptyState());
    localStorage.setItem(ENTRY_KEY, "{}");
    expect(loadEntries(localStorage)).toEqual(emptyState());
  });
});

describe("Stability rules", () => {
  it("keeps today in local time at midnight", () => {
    const before = new Date(2026, 10, 1, 23, 59, 59);
    expect(dayKey(before)).toBe("2026-11-01");
    expect(millisecondsUntilMidnight(before)).toBe(1000);
    expect(dayKey(new Date(before.getTime() + 1000))).toBe("2026-11-02");
  });
  it("retains yesterday's streak at midnight then breaks after a missed day", () => {
    const logs = { [habit.id]: ["2026-11-01"] };
    expect(currentStreak(habit, logs, new Date(2026, 10, 2, 0))).toBe(1);
    expect(currentStreak(habit, logs, new Date(2026, 10, 3, 0))).toBe(0);
  });
  it("rejects empty input", () => { expect(nameError("   ", [])).not.toBe(""); });
  it("rejects duplicate names ignoring case and surrounding space", () => { expect(nameError("  walk  ", ["Walk"])).not.toBe(""); });
  it("accepts distinct names and bounds very long input", () => {
    expect(nameError("Read", ["Walk"])).toBe("");
    expect(nameError("x".repeat(121), [])).not.toBe("");
  });
  it("recalculates all habit totals after editing the schedule", () => {
    const s = { ...emptyState(), habits: [habit], logs: { [habit.id]: ["2026-11-07"] } };
    const saturday = new Date(2026, 10, 7, 12);
    expect(dayCompletion(s, saturday)).toBe(100);
    s.habits = [{ ...habit, frequency: "weekdays" }];
    expect(dayCompletion(s, saturday)).toBeNull();
    expect(earnedBadges(s, saturday).some((b) => b.name === "Perfect day")).toBe(false);
  });
  it("removes deleted habit progress from charts and badges", () => {
    const s = { ...emptyState(), logs: { removed: ["2026-11-06"] } };
    expect(dayCompletion(s, today)).toBeNull();
    expect(weeklyScore(s, today)).toBe(0);
    expect(earnedBadges(s, today)).toEqual([]);
  });
});
describe("Weekly plans and travel", () => {
  const base = { time: "09:00", priority: "medium" as const, done: false };
  const meeting: Task = { id: "m", title: "Meeting", date: "2026-11-16", ...base, kind: "meeting" };
  const trip: Task = { id: "t", title: "Travel to Delhi", date: "2026-11-18", time: "08:00", priority: "high", done: false, kind: "travel", from: "Dubai", destination: "Delhi", returnDate: "2026-11-20" };
  const legacy: Task = { id: "l", title: "Legacy task", date: "2026-11-19", ...base };
  const all = [meeting, trip, legacy];

  it("treats older entries without a kind as plain tasks and ends one-day plans on their date", () => {
    expect(planEnd(legacy)).toBe("2026-11-19");
    expect(planEnd(meeting)).toBe("2026-11-16");
    expect(planEnd({ ...trip, returnDate: "2026-11-10" })).toBe("2026-11-18");
  });
  it("shows a trip on every day until the return date, with later days marked as continued", () => {
    expect(plansOn(all, "2026-11-18").map((p) => [p.task.id, p.continued])).toEqual([["t", false]]);
    expect(plansOn(all, "2026-11-19").map((p) => [p.task.id, p.continued])).toEqual([["t", true], ["l", false]]);
    expect(plansOn(all, "2026-11-20").map((p) => [p.task.id, p.continued])).toEqual([["t", true]]);
    expect(plansOn(all, "2026-11-21")).toEqual([]);
  });
  it("validates travel plans", () => {
    const ok = { kind: "travel" as const, date: "2026-11-18", destination: "Delhi", returnDate: "2026-11-20" };
    expect(planError(ok)).toBe("");
    expect(planError({ ...ok, returnDate: "" })).toBe("");
    expect(planError({ ...ok, destination: " " })).toBe("Enter a destination.");
    expect(planError({ ...ok, returnDate: "2026-11-17" })).toMatch(/before/);
    expect(planError({ ...ok, kind: "meeting", destination: "" })).toBe("");
  });
  it("keeps plan details when saved and reloaded, and still reads older data", () => {
    const state = { ...emptyState(), tasks: all };
    expect(parseState(JSON.parse(JSON.stringify(state)))?.tasks).toEqual(all);
    expect(parseState({ ...state, tasks: [{ ...trip, returnDate: "soon" }] })).toBeNull();
  });
  it("repeats a plan weekly as separate plans that share a series", () => {
    const made = repeatWeekly(meeting, 3);
    expect(made.map((t) => t.date)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(made[0]!.id).toBe("m");
    expect(new Set(made.map((t) => t.id)).size).toBe(3);
    expect(new Set(made.map((t) => t.seriesId)).size).toBe(1);
    expect(made.every((t) => !t.done)).toBe(true);
  });
});

describe("Reminders", () => {
  const h: Habit = { id: "h", name: "Read", icon: "📖", color: "chart-1", frequency: "daily", createdAt: "2026-11-01" };
  const plan: Task = { id: "p", title: "Call", date: "2026-11-18", time: "15:00", priority: "medium", done: false };
  const state = { ...emptyState(), habits: [h], tasks: [plan] };
  const on = { plans: true, evening: true };
  const at = (hh: number, mm = 0) => new Date(2026, 10, 18, hh, mm);
  it("announces a plan from 10 minutes before until 30 minutes after, once", () => {
    expect(dueReminders(state, at(14, 49), on, new Set())).toEqual([]);
    expect(dueReminders(state, at(14, 50), on, new Set()).map((r) => r.key)).toEqual(["plan:p:2026-11-18"]);
    expect(dueReminders(state, at(15, 29), on, new Set()).length).toBe(1);
    expect(dueReminders(state, at(15, 30), on, new Set())).toEqual([]);
    expect(dueReminders(state, at(14, 55), on, new Set(["plan:p:2026-11-18"]))).toEqual([]);
  });
  it("skips finished plans and turned-off reminders", () => {
    expect(dueReminders({ ...state, tasks: [{ ...plan, done: true }] }, at(14, 55), on, new Set())).toEqual([]);
    expect(dueReminders(state, at(14, 55), defaultReminders, new Set())).toEqual([]);
  });
  it("nudges about open habits only in the evening", () => {
    expect(dueReminders(state, at(19, 59), { plans: false, evening: true }, new Set())).toEqual([]);
    expect(dueReminders(state, at(20, 0), { plans: false, evening: true }, new Set())[0]?.body).toBe("Read is still open today.");
    expect(dueReminders({ ...state, logs: { h: ["2026-11-18"] } }, at(21), { plans: false, evening: true }, new Set())).toEqual([]);
  });
  it("ignores broken saved settings", () => {
    expect(loadReminders({ getItem: () => "{oops" })).toEqual(defaultReminders);
  });
});
