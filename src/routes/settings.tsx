import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/rise/visuals";
import { useRise } from "@/lib/store";
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
  const { reset, flush } = useRise();
  const { status, email, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cleared, setCleared] = useState(false);
  return <div>
    <PageHeader title="Settings" />
    {status === "signed-in" && <section className="border-t py-6">
      <h2 className="text-lg font-medium">Account</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Signed in as {email || "your account"}. Your progress syncs to every device where you sign in.</p>
      <Button variant="outline" disabled={signingOut} onClick={async () => { setSigningOut(true); const synced = await flush(); if (!synced && !window.confirm("Some recent changes have not synced yet and will be lost if you sign out. Sign out anyway?")) { setSigningOut(false); return; } await signOut(); }}><LogOut className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>
    </section>}
    <section className="border-t py-6">
      <h2 className="text-lg font-medium">Your data</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Resetting removes all habits, plans, dreams and progress, including on your other devices when you are signed in. This cannot be undone.</p>
      <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" />Reset all data</Button>
      {cleared && <p role="status" className="mt-4 text-sm text-muted-foreground">All data cleared. A fresh start.</p>}
    </section>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset all data?</DialogTitle><DialogDescription>All habits, completion history, plans, dreams, scores and badges will be permanently removed.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { reset(); setOpen(false); setCleared(true); }}>Confirm reset</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}