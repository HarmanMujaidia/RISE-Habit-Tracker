import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Download, LogOut, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { defaultReminders, loadReminders, saveReminders, type ReminderSettings } from "@/lib/reminders";
import { PageHeader } from "@/components/rise/visuals";
import { useRise } from "@/lib/store";
import { dayKey, type RiseState } from "@/lib/rise";
import { exportBackup, parseBackup } from "@/lib/rise-storage";
import { offerUndo } from "@/lib/undo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — Rise" },
    { name: "description", content: "Manage your Rise data and start fresh whenever you choose." },
    { property: "og:title", content: "Settings — Rise" },
    { property: "og:description", content: "Manage your Rise data and start fresh whenever you choose." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Settings,
});

function Settings() {
  const { state, update, today, reset, flush } = useRise();
  const { status, email, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cleared, setCleared] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<RiseState | null>(null);
  const [backupError, setBackupError] = useState("");
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackup(state)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rise-backup-${dayKey(today)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const pickFile = async (file: File | undefined) => {
    setBackupError("");
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (file.size > 10_000_000) { setBackupError("That file is too large to be a Rise backup."); return; }
    const parsed = parseBackup(await file.text());
    if (!parsed) { setBackupError("That file is not a valid Rise backup. Nothing was changed."); return; }
    setIncoming(parsed);
  };
  const restore = () => {
    if (!incoming) return;
    const previous = state;
    update(() => incoming);
    setIncoming(null);
    offerUndo("Backup restored", () => update(() => previous));
  };
  const [reminders, setReminders] = useState<ReminderSettings>(defaultReminders);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    try { setReminders(loadReminders(localStorage)); } catch { /* Defaults stay. */ }
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);
  const setReminder = async (key: keyof ReminderSettings, on: boolean) => {
    if (on && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const result = await Notification.requestPermission().catch(() => "denied" as const);
      setPermission(result);
      if (result !== "granted") return;
    }
    const next = { ...reminders, [key]: on };
    setReminders(next);
    try { saveReminders(localStorage, next); } catch { /* Stays on for this visit only. */ }
  };
  return <div>
    <PageHeader title="Settings" />
    {status === "signed-in" && <section className="border-t py-6">
      <h2 className="text-lg font-medium">Account</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Signed in as {email || "your account"}. Your progress syncs to every device where you sign in.</p>
      <Button variant="outline" disabled={signingOut} onClick={async () => { setSigningOut(true); const synced = await flush(); if (!synced && !window.confirm("Some recent changes have not synced yet and will be lost if you sign out. Sign out anyway?")) { setSigningOut(false); return; } await signOut(); }}><LogOut className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>
    </section>}
    <section className="border-t py-6">
      <h2 className="flex items-center gap-2 text-lg font-medium"><Bell className="h-4 w-4" />Reminders</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Notifications on this device only. They appear while Rise is open or running in your browser; a fully closed app cannot be woken without a server. On iPhone, add Rise to your Home Screen first.</p>
      {permission === "unsupported" && <p role="status" className="mb-3 text-sm text-muted-foreground">This browser does not support notifications.</p>}
      {permission === "denied" && <p role="status" className="mb-3 text-sm text-destructive">Notifications are blocked. Allow them for this site in your browser settings, then turn a reminder on.</p>}
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 text-sm"><span>Plans<span className="block text-xs text-muted-foreground">10 minutes before a plan starts</span></span><Switch disabled={permission === "unsupported"} checked={reminders.plans} onCheckedChange={(v) => void setReminder("plans", v)} aria-label="Plan reminders" /></label>
        <label className="flex items-center justify-between gap-4 text-sm"><span>Evening habits<span className="block text-xs text-muted-foreground">At 8 pm if habits are still open</span></span><Switch disabled={permission === "unsupported"} checked={reminders.evening} onCheckedChange={(v) => void setReminder("evening", v)} aria-label="Evening habit reminder" /></label>
      </div>
    </section>
    <section className="border-t py-6">
      <h2 className="text-lg font-medium">Backup</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Download everything as a file you can keep, or restore from one. Restoring replaces what is in the app now.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download}><Download className="h-4 w-4" />Download backup</Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" />Restore from file</Button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Backup file" tabIndex={-1} onChange={(e) => void pickFile(e.target.files?.[0])} />
      </div>
      {backupError && <p role="alert" className="mt-3 text-sm text-destructive">{backupError}</p>}
    </section>
    <section className="border-t py-6">
      <h2 className="text-lg font-medium">Your data</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Resetting removes all habits, plans, dreams and progress, including on your other devices when you are signed in. This cannot be undone.</p>
      <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" />Reset all data</Button>
      {cleared && <p role="status" className="mt-4 text-sm text-muted-foreground">All data cleared. A fresh start.</p>}
    </section>
    <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) setIncoming(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Restore this backup?</DialogTitle><DialogDescription>It contains {incoming?.habits.length ?? 0} habits, {incoming?.tasks.length ?? 0} plans and {incoming?.dreams.length ?? 0} dreams. Your current data will be replaced. You can undo this right after.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIncoming(null)}>Cancel</Button><Button onClick={restore}>Restore</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset all data?</DialogTitle><DialogDescription>All habits, completion history, plans, dreams, scores and badges will be permanently removed.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { reset(); setOpen(false); setCleared(true); }}>Confirm reset</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}