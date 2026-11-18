import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Check, LayoutGrid, List, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRise } from "@/lib/store";
import { offerUndo } from "@/lib/undo";
import { CATEGORIES, nameError, completionRate, dayKey, dreamProgress, linkedHabits, uid, type Category, type Dream } from "@/lib/rise";
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
  const { state, update, today } = useRise();
  const [board, setBoard] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const setDream = (id: string, fn: (d: Dream) => Dream) => update((s) => ({ ...s, dreams: s.dreams.map((d) => {
    if (d.id !== id) return d;
    const next = fn(d);
    return next.achieved && next.milestones.some((m) => !m.done) ? { ...next, achieved: false, achievedAt: undefined } : next;
  }) }));
  const achieve = (id: string) => {
    setDream(id, (d) => ({ ...d, achieved: true, achievedAt: dayKey(new Date()), milestones: d.milestones.map((m) => ({ ...m, done: true })) }));
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 2200);
  };
  const current = state.dreams.find((d) => d.id === detail);
  const deleteDream = (dream: Dream) => {
    const index = state.dreams.findIndex((d) => d.id === dream.id);
    update((s) => ({ ...s, dreams: s.dreams.filter((d) => d.id !== dream.id) }));
    offerUndo(`“${dream.title}” deleted`, () => update((s) => s.dreams.some((d) => d.id === dream.id) ? s : { ...s, dreams: [...s.dreams.slice(0, index), dream, ...s.dreams.slice(index)] }));
  };
  const editingDream = state.dreams.find((d) => d.id === editing);

  return (
    <div>
      <PageHeader
        title="Dreams & Goals"
        subtitle="See it. Break it down. Make it real."
        action={
          <div className="flex flex-wrap justify-end gap-2">
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
          const p = dreamProgress(d, state, today);
          const days = d.targetDate ? differenceInCalendarDays(parseISO(d.targetDate), today) : null;
          return (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              whileHover={{ y: -3 }}
              onClick={() => setDetail(d.id)}
              className={`surface group block w-full break-inside-avoid overflow-hidden text-left ${board ? "" : "flex items-center gap-4"}`}
            >
              <div className={`relative overflow-hidden ${board ? (i % 3 === 0 ? "h-64" : "h-44") : "h-24 w-28 shrink-0"}`}>
                {d.cover ? <img src={d.cover} alt={d.title} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-muted"><Trophy className="h-10 w-10 text-muted-foreground" /></div>}
                {d.achieved && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <Trophy className="h-3 w-3 text-primary" /> {board && "Achieved"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
                  <span style={{ color: CAT_COLOR[d.category] }}>{d.category}</span>
                  <span className="text-muted-foreground">{d.achieved ? (isValid(parseISO(d.achievedAt ?? "")) ? format(parseISO(d.achievedAt ?? ""), "MMM yyyy") : "Achieved") : days == null ? "No target date" : days >= 0 ? `${days}d left` : "overdue"}</span>
                </div>
                <div className="break-words font-serif text-lg">{d.title}</div>
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
          <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto rounded-2xl p-0">
            {current.cover && <img src={current.cover} alt="" className="h-48 w-full object-cover" />}
            <div className="space-y-4 p-6 pt-2">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{current.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{current.description}</p>
              <div className="flex items-center gap-3">
                <Bar value={dreamProgress(current, state, today)} color={CAT_COLOR[current.category]} className="h-2.5" />
                <span className="text-sm tabular-nums">{dreamProgress(current, state, today)}%</span>
              </div>
              <div className="space-y-1">
                {current.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                    <button role="checkbox" aria-checked={m.done} aria-label={`Complete ${m.title}`} onClick={() => setDream(current.id, (d) => ({ ...d, milestones: d.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) }))} className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${m.done ? "border-primary bg-primary" : "border-border"}`}>
                      {m.done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                    </button>
                    <span className={`min-w-0 flex-1 break-words text-sm ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</span>
                    <button aria-label="Remove milestone" onClick={() => setDream(current.id, (d) => ({ ...d, milestones: d.milestones.filter((x) => x.id !== m.id) }))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <MilestoneAdder key={current.id} existing={current.milestones.map((m) => m.title)} onAdd={(t) => setDream(current.id, (d) => ({ ...d, milestones: [...d.milestones, { id: uid(), title: t, done: false }] }))} />
              </div>
              {linkedHabits(current, state.habits).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Supported by habits</div>
                  {linkedHabits(current, state.habits).map((h) => (
                    <div key={h.id} className="flex items-center gap-3 text-sm">
                      <span>{h.icon}</span>
                      <span className="min-w-0 flex-1 break-words">{h.name}</span>
                      <span className="tabular-nums text-muted-foreground">{completionRate(h, state.logs, 30, today)}% last 30 days</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <div className="flex gap-1">
                  <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
                  <Button variant="outline" className="rounded-full" onClick={() => { setEditing(current.id); setDetail(null); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                </div>
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

      <AlertDialog open={confirmDelete && !!current} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dream?</AlertDialogTitle>
            <AlertDialogDescription>“{current?.title}” and its milestones will be removed from all your devices.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (current) deleteDream(current); setDetail(null); setConfirmDelete(false); }}>Delete dream</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DreamDialog open={open} onOpenChange={setOpen} onSave={(d) => { update((s) => ({ ...s, dreams: [d, ...s.dreams] })); setOpen(false); }} />
      {editingDream && (
        <DreamDialog
          key={editingDream.id}
          open
          dream={editingDream}
          onOpenChange={(o) => { if (!o) { setEditing(null); setDetail(editingDream.id); } }}
          onSave={(next) => {
            setDream(editingDream.id, (d) => ({ ...d, title: next.title, description: next.description, category: next.category, targetDate: next.targetDate, cover: next.cover, habitIds: next.habitIds }));
            setEditing(null);
            setDetail(editingDream.id);
          }}
        />
      )}
      <Celebration show={celebrate} />
    </div>
  );
}

/** Shrinks a picture so it stays small when saved and synced. Falls back to the original. */
function shrinkImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try { resolve(canvas.toDataURL("image/jpeg", 0.8)); } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function MilestoneAdder({ onAdd, existing }: { onAdd: (t: string) => void; existing: string[] }) {
  const [t, setT] = useState("");
  const go = () => { if (!nameError(t, existing)) { onAdd(t.trim()); setT(""); } };
  return (
    <div className="flex gap-2 pt-2">
      <Input aria-label="Milestone title" maxLength={120} placeholder="Add a milestone…" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <Button disabled={!!nameError(t, existing)} size="icon" variant="outline" aria-label="Add milestone" onClick={go}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

/** Adds a new dream, or edits an existing one when `dream` is given. */
function DreamDialog({ open, onOpenChange, onSave, dream }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: Dream) => void; dream?: Dream }) {
  const { state } = useRise();
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [title, setTitle] = useState(dream?.title ?? "");
  const [desc, setDesc] = useState(dream?.description ?? "");
  const [cat, setCat] = useState<Category>(dream?.category ?? "personal");
  const [date, setDate] = useState(dream?.targetDate ?? "");
  const [cover, setCover] = useState(dream?.cover ?? "");
  const [ms, setMs] = useState("");
  const [habitIds, setHabitIds] = useState<string[]>(dream?.habitIds ?? []);
  const toggleHabit = (id: string) => setHabitIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const error = nameError(title, state.dreams.filter((d) => d.id !== dream?.id).map((d) => d.title));
  const blocked = !!error || !!fileError || reading;
  const save = () => {
    if (blocked) return;
    onSave({
      id: dream?.id ?? uid(),
      title: title.trim(),
      description: desc.trim(),
      category: cat,
      targetDate: date,
      cover: cover.trim(),
      milestones: dream ? dream.milestones : [...new Map(ms.split("\n").map((s) => s.trim().slice(0, 120)).filter(Boolean).map((t) => [t.toLocaleLowerCase(), t])).values()].map((t) => ({ id: uid(), title: t, done: false })),
      achieved: dream?.achieved ?? false,
      achievedAt: dream?.achievedAt,
      habitIds: habitIds.length ? habitIds : undefined,
    });
    if (!dream) { setTitle(""); setDesc(""); setCover(""); setMs(""); setDate(""); setHabitIds([]); }
  };
  const onFile = (f?: File) => {
    setFileError("");
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 8_000_000) { setFileError("Choose an image smaller than 8 MB."); return; }
    setReading(true);
    const r = new FileReader();
    r.onerror = () => { setFileError("This image could not be read."); setReading(false); };
    r.onload = async () => { setCover(await shrinkImage(String(r.result))); setReading(false); };
    r.readAsDataURL(f);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="font-serif text-2xl">{dream ? "Edit dream" : "A new dream"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input aria-label="Dream title" maxLength={120} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea maxLength={2000} placeholder="Describe it…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={cat} onValueChange={(v) => setCat(v as Category)}>
              <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" aria-label="Target date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{dream ? "Picture (upload a new one or paste a link)" : "Cover image (optional — upload or paste a link)"}</label>
            {cover && (
              <div className="relative overflow-hidden rounded-xl border">
                <img src={cover} alt="Cover preview" className="h-32 w-full object-cover" />
                <Button type="button" size="sm" variant="secondary" className="absolute right-2 top-2 rounded-full" onClick={() => { setCover(""); setFileError(""); }}>Remove picture</Button>
              </div>
            )}
            <Input type="file" accept="image/*" aria-label="Upload picture" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Input aria-label="Picture link" placeholder="https://…" value={cover.startsWith("data:") ? "" : cover} onChange={(e) => setCover(e.target.value)} />
          </div>
          {state.habits.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Habits that support this dream (optional). Their last 30 days count toward its progress.</div>
              <div className="flex flex-wrap gap-2">
                {state.habits.map((h) => {
                  const on = habitIds.includes(h.id);
                  return <button key={h.id} type="button" aria-pressed={on} onClick={() => toggleHabit(h.id)} className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>{h.icon} {h.name}</button>;
                })}
              </div>
            </div>
          )}
          {dream
            ? <p className="text-xs text-muted-foreground">Add, tick or remove milestones from the dream's details.</p>
            : <Textarea maxLength={6000} placeholder={"Milestones, one per line"} value={ms} onChange={(e) => setMs(e.target.value)} rows={3} />}
        </div>
        {(fileError || (title.trim() && error)) && <p role="alert" className="text-sm text-destructive">{fileError || error}</p>}
        <DialogFooter><Button disabled={blocked} onClick={save} className="rounded-full">{reading ? "Preparing picture…" : dream ? "Save changes" : "Add to vision board"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
