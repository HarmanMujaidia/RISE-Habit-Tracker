import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ message, label, to, onClick }: {
  message: string;
  label?: string;
  to?: "/habits" | "/plans" | "/dreams";
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-5">
      <p className="text-sm text-muted-foreground">{message}</p>
      {label && (to ? <Button asChild size="sm"><Link to={to}><Plus className="h-4 w-4" />{label}</Link></Button> : <Button size="sm" onClick={onClick}><Plus className="h-4 w-4" />{label}</Button>)}
    </div>
  );
}