import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { emptyState, millisecondsUntilMidnight, type RiseState } from "./rise";
import { loadEntries, saveEntries } from "./rise-storage";
import { LoadingSkeleton } from "@/components/rise/LoadingSkeleton";

interface Ctx {
  state: RiseState;
  update: (fn: (s: RiseState) => RiseState) => void;
  reset: () => void;
  today: Date;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RiseState | null>(null);
  const [today, setToday] = useState(() => new Date());
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    try { setState(loadEntries(localStorage)); } catch { setState(emptyState()); setSaveFailed(true); }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      setToday(now);
      clearTimeout(timer);
      timer = setTimeout(refresh, Math.min(millisecondsUntilMidnight(now) + 25, 60_000));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    if (state) { try { setSaveFailed(!saveEntries(localStorage, state)); } catch { setSaveFailed(true); } }
  }, [state]);

  const update = useCallback((fn: (s: RiseState) => RiseState) => setState((s) => {
    if (!s) return s;
    const next = fn(s);
    try { saveEntries(localStorage, next); } catch { /* The effect displays storage errors. */ }
    return next;
  }), []);
  const reset = useCallback(() => update(() => emptyState()), [update]);

  if (!state)
    return <LoadingSkeleton />;
  return <StoreCtx.Provider value={{ state, update, reset, today }}>
    {saveFailed && <p role="alert" className="mb-4 text-sm text-destructive">Your changes could not be saved in this browser. Free some storage or allow browser storage before refreshing.</p>}
    {children}
  </StoreCtx.Provider>;
}

export function useRise() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useRise outside provider");
  return c;
}
