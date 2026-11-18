import { Briefcase, Heart, ListTodo, Plane, Users, type LucideIcon } from "lucide-react";
import type { PlanKind } from "@/lib/rise";

export const KIND_ICON: Record<PlanKind, LucideIcon> = { task: ListTodo, meeting: Users, work: Briefcase, travel: Plane, personal: Heart };
