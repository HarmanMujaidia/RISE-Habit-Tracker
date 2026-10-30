import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays, format, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import { useRise } from "@/lib/store";
import { colorVar, currentStreak, dayCompletion, dayKey, dreamProgress, isDone, isScheduled, taskScore } from "@/lib/rise";
import { Heatmap, Panel, ProgressRing, tooltipStyle } from "@/components/rise/visuals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Rise" },
      { name: "description", content: "Your daily overview of habits, plans and dreams." },
      { property: "og:title", content: "Today — Rise" },
      { property: "og:description", content: "Your daily overview of habits, plans and dreams." },
    ],
  }),
  component: Dashboard,
});

const LINES = [
  "Small steps, every day.",
  "You don't rise to your goals, you fall to your systems.",
  "Consistency beats intensity.",
  "Be the person your future self thanks.",
  "Progress, not perfection.",
  "Discipline is choosing what you want most.",
  "One good day at a time.",
];

function Dashboard() {
  const { state, update } = useRise();
  const today = new Date();
  const tk = dayKey(today);
  const hour = today.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todayHabits = state.habits.filter((h) => isScheduled(h, today));
  const todayPct = dayCompletion(state, today) ?? 0;
  const streak = Math.max(0, ...state.habits.map((h) => currentStreak(h, state.logs)));
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { day: format(d, "EEE"), value: d > today ? 0 : dayCompletion(state, d) ?? 0 };
  });
  const elapsed = week.slice(0, Math.min(7, Math.floor((today.getTime() - weekStart.getTime()) / 864e5) + 1));
  const weekly = Math.round(elapsed.reduce((a, b) => a + b.value, 0) / elapsed.length);
  const month = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i - 29);
    return { day: format(d, "MMM d"), value: dayCompletion(state, d) ?? 0 };
  });
  const active = state.dreams.filter((d) => !d.achieved);
  const dreamsAvg = state.dreams.length ? Math.round(state.dreams.reduce((a, d) => a + dreamProgress(d), 0) / state.dreams.length) : 0;
  const todayTasks = state.tasks.filter((t) => t.date === tk).sort((a, b) => a.time.localeCompare(b.time));

  const toggleHabit = (id: string) =>
    update((s) => {
      const l = s.logs[id] ?? [];
      return { ...s, logs: { ...s.logs, [id]: l.includes(tk) ? l.filter((x) => x !== tk) : [...l, tk] } };
    });
  const toggleTask = (id: string) => update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));

  const stats = [
    { label: "Today", value: <ProgressRing value={todayPct} size={64} stroke={6} />, icon: Check, note: `${todayHabits.filter((h) => isDone(state.logs, h.id, tk)).length}/${todayHabits.length} habits` },
    { label: "Streak", value: <span className="font-serif text-4xl">{streak}</span>, icon: Flame, note: "days in a row" },
    { label: "Weekly score", value: <span className="font-serif text-4xl">{weekly}</span>, icon: TrendingUp, note: "avg completion" },
    { label: "Dreams", value: <ProgressRing value={dreamsAvg} size={64} stroke={6} color="var(--chart-2)" />, icon: Sparkles, note: `${active.length} in progress` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-5xl">{greet}.</h1>
        <p className="mt-2 font-serif text-lg italic text-muted-foreground">“{LINES[today.getDay()]}”</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="surface flex flex-col justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
              <s.icon className="h-4 w-4" />
            </div>
            <div className="flex h-16 items-center">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.note}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Today" className="lg:col-span-1 lg:row-span-2">
          <div className="space-y-2">
            {todayHabits.map((h) => {
              const done = isDone(state.logs, h.id, tk);
              return (
                <button key={h.id} onClick={() => toggleHabit(h.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted">
                  <motion.span
                    whileTap={{ scale: 0.8 }}
                    animate={done ? { scale: [1, 1.2, 1] } : {}}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: colorVar(h.color), background: done ? colorVar(h.color) : "transparent" }}
                  >
                    {done && <Check className="h-4 w-4 text-primary-foreground" />}
                  </motion.span>
                  <span className="text-lg">{h.icon}</span>
                  <span className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{h.name}</span>
                </button>
              );
            })}
          </div>
          <div className="my-4 border-t" />
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            Plans <span>{taskScore(todayTasks)}%</span>
          </div>
          <div className="space-y-1">
            {todayTasks.map((t) => (
              <button key={t.id} onClick={() => toggleTask(t.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${t.done ? "border-primary bg-primary" : "border-border"}`}>
                  {t.done && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="w-11 text-xs tabular-nums text-muted-foreground">{t.time}</span>
                <span className={`text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
              </button>
            ))}
            {!todayTasks.length && (
              <Link to="/plans" className="text-sm text-primary">
                Plan your day →
              </Link>
            )}
          </div>
        </Panel>

        <Panel title="This week" className="lg:col-span-2">
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={week}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Completed"]} />
                <RBar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 8, 8]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="30-day consistency" className="lg:col-span-2">
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={month}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--border)" }} formatter={(v) => [`${v}%`, "Completed"]} />
                <Line type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Habit heatmap" className="lg:col-span-2">
          <Heatmap weeks={20} getValue={(d) => dayCompletion(state, d)} />
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            Less
            {[0, 30, 60, 100].map((v) => (
              <span key={v} className="h-3 w-3 rounded-[3px]" style={{ background: v ? `color-mix(in oklab, var(--primary) ${25 + v * 0.75}%, var(--heat-0))` : "var(--heat-0)" }} />
            ))}
            More
          </div>
        </Panel>
        <Panel title="Goal progress" action={<Link to="/dreams" className="text-xs text-primary">All →</Link>}>
          <div className="grid grid-cols-2 gap-4">
            {state.dreams.slice(0, 4).map((d, i) => (
              <div key={d.id} className="flex flex-col items-center gap-2 text-center">
                <ProgressRing value={dreamProgress(d)} size={76} stroke={7} color={`var(--chart-${(i % 5) + 1})`} />
                <span className="line-clamp-1 text-xs text-muted-foreground">{d.title}</span>
              </div>
            ))}
          </div>
          {!state.dreams.length && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" /> Add your first dream
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
