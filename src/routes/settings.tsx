import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/rise/visuals";
import { useRise } from "@/lib/store";

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
  const { reset } = useRise();
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  return <div>
    <PageHeader title="Settings" />
    <section className="border-t py-6">
      <h2 className="text-lg font-medium">Your data</h2>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">Resetting removes all habits, plans, dreams and progress saved in this browser. This cannot be undone.</p>
      <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" />Reset all data</Button>
      {cleared && <p role="status" className="mt-4 text-sm text-muted-foreground">All data cleared. A fresh start.</p>}
    </section>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset all data?</DialogTitle><DialogDescription>All habits, completion history, plans, dreams, scores and badges will be permanently removed from this browser.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { reset(); setOpen(false); setCleared(true); }}>Confirm reset</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}