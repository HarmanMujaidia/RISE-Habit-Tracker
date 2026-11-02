import { createFileRoute } from "@tanstack/react-router";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRise } from "@/lib/store";
import { earnedBadges, bestStreak, colorVar, currentStreak, dayCompletion, dayKey, dreamProgress, taskScore } from "@/lib/rise";
import { PageHeader, Panel, tooltipStyle } from "@/components/rise/visuals";

import { EmptyState } from "@/components/rise/EmptyState";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Insights & Achievements — Rise" },
      { name: "description", content: "Charts and badges that show how far you've come." },
      { property: "og:title", content: "Insights & Achievements — Rise" },
      { property: "og:description", content: "Charts and badges that show how far you've come." },
    ],
  }),
  component: AnalyticsPage,
});

type Range = "week" | "month" | "year";

function AnalyticsPage() {
  const { state, today } = useRise();
  const reduced = useReducedMotion();
  const [range, setRange] = useState<Range>("month");

  // buckets: week=7 days, month=30 days, year=12 months
  const buckets =
    range === "year"
      ? Array.from({ length: 12 }, (_, i) => {
          const month = addMonths(today, i - 11);
          const end = i === 11 ? today : endOfMonth(month);
          return { label: format(month, "MMM"), days: eachDayOfInterval({ start: startOfMonth(month), end }) };
        })
      : Array.from({ length: range === "week" ? 7 : 30 }, (_, i) => {
          const d = addDays(today, i - (range === "week" ? 6 : 29));
          return { label: format(d, range === "week" ? "EEE" : "d"), days: [d] };
        });

  const series = buckets.map((b) => {
    const vals = b.days.map((d) => dayCompletion(state, d)).filter((v): v is number => v != null);
    const keys = new Set(b.days.map(dayKey));
    const ts = state.tasks.filter((t) => keys.has(t.date) && t.date <= dayKey(today));
    return {
      label: b.label,
      habits: vals.length ? Math.round(vals.reduce((a, c) => a + c, 0) / vals.length) : 0,
      plans: ts.filter((t) => t.done).length,
    };
  });

  const streaks = state.habits.map((h) => ({ id: h.id, name: h.name, icon: h.icon, best: bestStreak(h, state.logs), current: currentStreak(h, state.logs), color: colorVar(h.color) }));
  const maxBest = Math.max(0, ...streaks.map((s) => s.best));
  const achieved = state.dreams.filter((d) => d.achieved).length;
  const dreamPie = [
    { name: "Achieved", value: achieved, fill: "var(--chart-1)" },
    { name: "In progress", value: state.dreams.length - achieved, fill: "var(--chart-2)" },
  ];
  const allTasks = state.tasks.filter((t) => t.date <= dayKey(today));
  const badges = earnedBadges(state, today);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="Proof that you're becoming who you want to be."
        action={
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="rounded-full">
              <TabsTrigger value="week" className="rounded-full">Week</TabsTrigger>
              <TabsTrigger value="month" className="rounded-full">Month</TabsTrigger>
              <TabsTrigger value="year" className="rounded-full">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {!state.habits.length && !state.tasks.length && !state.dreams.length && <EmptyState message="No activity yet. Your insights will grow with your progress." label="Add habit" to="/habits" />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Habits over time">
          {!state.habits.length && <EmptyState message="No habits yet." label="Add habit" to="/habits" />}
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={range === "month" ? 4 : 0} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--border)" }} formatter={(v) => [`${v}%`, "Habits"]} />
                <Area isAnimationActive={!reduced} animationDuration={240} animationBegin={0} type="monotone" dataKey="habits" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#hg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Plans completed">
          {!state.tasks.length && <EmptyState message="No plans yet." label="Add plan" to="/plans" />}
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={range === "month" ? 4 : 0} />
                <YAxis hide domain={[0, (max: number) => Math.max(1, max)]} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "Tasks done"]} />
                <RBar isAnimationActive={!reduced} animationDuration={240} animationBegin={0} dataKey="plans" fill="var(--chart-2)" radius={[6, 6, 6, 6]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Dreams achieved">
          {!state.dreams.length && <EmptyState message="No dreams yet." label="Add dream" to="/dreams" />}
          <div className="flex flex-wrap items-center gap-6">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie isAnimationActive={!reduced} animationDuration={240} animationBegin={0} data={dreamPie} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={4} cornerRadius={8} stroke="none">
                    {dreamPie.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div><div className="font-serif text-4xl">{achieved}</div><div className="text-sm text-muted-foreground">achieved of {state.dreams.length}</div></div>
              <div className="text-sm text-muted-foreground">Avg progress <span className="font-medium text-foreground">{state.dreams.length ? Math.round(state.dreams.reduce((a, d) => a + dreamProgress(d), 0) / state.dreams.length) : 0}%</span></div>
              <div className="text-sm text-muted-foreground">Task rate <span className="font-medium text-foreground">{taskScore(allTasks)}%</span></div>
            </div>
          </div>
        </Panel>
        <Panel title="Best streaks">
          {!streaks.length && <p className="text-sm text-muted-foreground">No streaks yet. Complete a habit to begin.</p>}
          <div className="space-y-3">
            {streaks.sort((a, b) => b.best - a.best).map((s) => (
              <div key={s.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="min-w-0 flex-1 break-words">{s.icon} {s.name}</span><span className="tabular-nums text-muted-foreground">{s.current} / {s.best}d</span></div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${maxBest ? (s.best / maxBest) * 100 : 0}%` }} transition={{ duration: 0.24 }} />
                  <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${maxBest ? (s.current / maxBest) * 100 : 0}%` }} transition={{ duration: 0.24 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Badges">
        {!badges.length && <p className="text-sm text-muted-foreground">No badges earned yet. Every small step counts.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b, i) => (
            <motion.div key={b.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${b.earned ? "bg-accent" : "opacity-50 grayscale"}`}>
              <span className="text-3xl">{b.icon}</span>
              <span className="text-sm font-medium">{b.name}</span>
              <span className="text-[11px] text-muted-foreground">Earned</span>
            </motion.div>
          ))}
        </div>
      </Panel>
      <span className="sr-only">{parseISO(dayKey(today)).getFullYear()}</span>
    </div>
  );
}
