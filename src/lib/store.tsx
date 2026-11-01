import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { emptyState, type RiseState } from "./rise";
import { loadEntries, saveEntries } from "./rise-storage";

interface Ctx {
  state: RiseState;
  update: (fn: (s: RiseState) => RiseState) => void;
  reset: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RiseState | null>(null);

  useEffect(() => {
    setState(loadEntries(localStorage));
  }, []);

  useEffect(() => {
    if (state) saveEntries(localStorage, state);
  }, [state]);

  const update = useCallback((fn: (s: RiseState) => RiseState) => setState((s) => (s ? fn(s) : s)), []);
  const reset = useCallback(() => setState(() => { const fresh = emptyState(); saveEntries(localStorage, fresh); return fresh; }), []);

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
