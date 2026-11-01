import { describe, expect, it } from "vitest";
import { bestStreak, completionRate, currentStreak, dayCompletion, dreamProgress, earnedBadges, emptyState, taskScore, weeklyScore, type Habit } from "@/lib/rise";
import { ENTRY_KEY, LEGACY_KEY, loadEntries, saveEntries } from "@/lib/rise-storage";

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