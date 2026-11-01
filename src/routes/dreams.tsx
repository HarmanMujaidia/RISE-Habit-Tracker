import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Check, LayoutGrid, List, Plus, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRise } from "@/lib/store";
import { CATEGORIES, dayKey, dreamProgress, uid, type Category, type Dream } from "@/lib/rise";
import { Bar, Celebration, PageHeader } from "@/components/rise/visuals";

import { EmptyState } from "@/components/rise/EmptyState";

export const Route = createFileRoute("/dreams")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dreams & Goals — Rise" },
      { name: "description", content: "A vision board for your dreams, broken into milestones." },
      { property: "og:title", content: "Dreams & Goals — Rise" },
      { property: "og:description", content: "A vision board for your dreams, broken into milestones." },
    ],
  }),
  component: DreamsPage,
});

const CAT_COLOR: Record<Category, string> = { career: "var(--chart-2)", health: "var(--chart-1)", travel: "var(--chart-3)", finance: "var(--chart-5)", personal: "var(--chart-4)" };

function DreamsPage() {
  const { state, update } = useRise();
  const [board, setBoard] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const setDream = (id: string, fn: (d: Dream) => Dream) => update((s) => ({ ...s, dreams: s.dreams.map((d) => (d.id === id ? fn(d) : d)) }));
  const achieve = (id: string) => {
    setDream(id, (d) => ({ ...d, achieved: true, achievedAt: dayKey(new Date()), milestones: d.milestones.map((m) => ({ ...m, done: true })) }));
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 2200);
  };
  const current = state.dreams.find((d) => d.id === detail);

  return (
    <div>
      <PageHeader
        title="Dreams & Goals"
        subtitle="See it. Break it down. Make it real."
        action={
          <div className="flex gap-2">
            <div className="flex rounded-full border bg-card p-1">
              <button aria-label="Vision board" onClick={() => setBoard(true)} className={`rounded-full p-1.5 ${board ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}><LayoutGrid className="h-4 w-4" /></button>
              <button aria-label="List" onClick={() => setBoard(false)} className={`rounded-full p-1.5 ${!board ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button>
            </div>
            <Button onClick={() => setOpen(true)} className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New dream</Button>
          </div>
        }
      />

      {!state.dreams.length && <EmptyState message="No dreams yet. Add your first dream and make it your own." label="Add dream" onClick={() => setOpen(true)} />}

      <div className={board ? "columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4" : "space-y-3"}>
        {state.dreams.map((d, i) => {
          const p = dreamProgress(d);
          const days = d.targetDate ? differenceInCalendarDays(parseISO(d.targetDate), new Date()) : null;
          return (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              onClick={() => setDetail(d.id)}
              className={`surface group block w-full break-inside-avoid overflow-hidden text-left ${board ? "" : "flex items-center gap-4"}`}
            >
              <div className={`relative overflow-hidden ${board ? (i % 3 === 0 ? "h-64" : "h-44") : "h-24 w-28 shrink-0"}`}>
                {d.cover ? <img src={d.cover} alt={d.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-muted"><Trophy className="h-10 w-10 text-muted-foreground" /></div>}
                {d.achieved && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <Trophy className="h-3 w-3 text-primary" /> {board && "Achieved"}
                  </span>
                )}
              </div>
              <div className="flex-1 p-4">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
                  <span style={{ color: CAT_COLOR[d.category] }}>{d.category}</span>
                  <span className="text-muted-foreground">{d.achieved ? format(parseISO(d.achievedAt ?? d.targetDate), "MMM yyyy") : days == null ? "No target date" : days >= 0 ? `${days}d left` : "overdue"}</span>
                </div>
                <div className="font-serif text-lg">{d.title}</div>
                {board && d.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <Bar value={p} color={CAT_COLOR[d.category]} />
                  <span className="text-xs tabular-nums text-muted-foreground">{p}%</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <Dialog open={!!current} onOpenChange={(o) => !o && setDetail(null)}>
        {current && (
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-0">
            {current.cover && <img src={current.cover} alt="" className="h-48 w-full object-cover" />}
            <div className="space-y-4 p-6 pt-2">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{current.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{current.description}</p>
              <div className="flex items-center gap-3">
                <Bar value={dreamProgress(current)} color={CAT_COLOR[current.category]} className="h-2.5" />
                <span className="text-sm tabular-nums">{dreamProgress(current)}%</span>
              </div>
              <div className="space-y-1">
                {current.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                    <button aria-label="Toggle milestone" onClick={() => setDream(current.id, (d) => ({ ...d, milestones: d.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) }))} className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${m.done ? "border-primary bg-primary" : "border-border"}`}>
                      {m.done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-sm ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</span>
                    <button aria-label="Remove milestone" onClick={() => setDream(current.id, (d) => ({ ...d, milestones: d.milestones.filter((x) => x.id !== m.id) }))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <MilestoneAdder onAdd={(t) => setDream(current.id, (d) => ({ ...d, milestones: [...d.milestones, { id: uid(), title: t, done: false }] }))} />
              </div>
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button variant="ghost" className="text-destructive" onClick={() => { update((s) => ({ ...s, dreams: s.dreams.filter((d) => d.id !== current.id) })); setDetail(null); }}>Delete</Button>
                {current.achieved ? (
                  <Button variant="outline" className="rounded-full" onClick={() => setDream(current.id, (d) => ({ ...d, achieved: false, achievedAt: undefined }))}>Mark as in progress</Button>
                ) : (
                  <Button className="rounded-full" onClick={() => achieve(current.id)}><Trophy className="mr-1 h-4 w-4" /> Mark achieved</Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <NewDream open={open} onOpenChange={setOpen} onSave={(d) => { update((s) => ({ ...s, dreams: [d, ...s.dreams] })); setOpen(false); }} />
      <Celebration show={celebrate} />
    </div>
  );
}

function MilestoneAdder({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  const go = () => { if (t.trim()) { onAdd(t.trim()); setT(""); } };
  return (
    <div className="flex gap-2 pt-2">
      <Input placeholder="Add a milestone…" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <Button size="icon" variant="outline" aria-label="Add milestone" onClick={go}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

function NewDream({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: Dream) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<Category>("personal");
  const [date, setDate] = useState("");
  const [cover, setCover] = useState("");
  const [ms, setMs] = useState("");
  const save = () => {
    onSave({
      id: uid(),
      title: title.trim(),
      description: desc.trim(),
      category: cat,
      targetDate: date,
      cover: cover.trim(),
      milestones: ms.split("\n").map((s) => s.trim()).filter(Boolean).map((t) => ({ id: uid(), title: t, done: false })),
      achieved: false,
    });
    setTitle(""); setDesc(""); setCover(""); setMs(""); setDate("");
  };
  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCover(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="font-serif text-2xl">A new dream</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Describe it…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={cat} onValueChange={(v) => setCat(v as Category)}>
              <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cover image (optional — upload or paste a link)</label>
            <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            <Input placeholder="https://…" value={cover.startsWith("data:") ? "" : cover} onChange={(e) => setCover(e.target.value)} />
          </div>
          <Textarea placeholder={"Milestones, one per line"} value={ms} onChange={(e) => setMs(e.target.value)} rows={3} />
        </div>
        <DialogFooter><Button disabled={!title.trim()} onClick={save} className="rounded-full">Add to vision board</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
