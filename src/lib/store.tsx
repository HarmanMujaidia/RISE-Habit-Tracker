import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { makeSeed, type RiseState } from "./rise";
import career from "@/assets/dream-career.jpg";
import health from "@/assets/dream-health.jpg";
import travel from "@/assets/dream-travel.jpg";
import finance from "@/assets/dream-finance.jpg";

export const COVERS: Record<string, string> = { career, health, travel, finance, personal: health };

const KEY = "rise-state-v1";

interface Ctx {
  state: RiseState;
  update: (fn: (s: RiseState) => RiseState) => void;
  reset: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RiseState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setState(raw ? JSON.parse(raw) : makeSeed(COVERS));
    } catch {
      setState(makeSeed(COVERS));
    }
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (s: RiseState) => RiseState) => setState((s) => (s ? fn(s) : s)), []);
  const reset = useCallback(() => setState(makeSeed(COVERS)), []);

  if (!state)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  return <StoreCtx.Provider value={{ state, update, reset }}>{children}</StoreCtx.Provider>;
}

export function useRise() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useRise outside provider");
  return c;
}
