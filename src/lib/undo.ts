import { toast } from "sonner";

/** Confirms a delete and offers to bring the item back for a few seconds. */
export function offerUndo(message: string, undo: () => void) {
  toast(message, { duration: 8000, action: { label: "Undo", onClick: undo } });
}
