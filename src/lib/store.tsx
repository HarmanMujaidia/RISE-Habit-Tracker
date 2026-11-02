import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { emptyState, millisecondsUntilMidnight, type RiseState } from "./rise";
import { loadEntries, saveEntries } from "./rise-storage";
import { CloudError, pullState, pushState } from "./cloud";
import { useAuth } from "./auth";
import { LoadingSkeleton } from "@/components/rise/LoadingSkeleton";

interface Ctx {
  state: RiseState;
  update: (fn: (s: RiseState) => RiseState) => void;
  reset: () => void;
  today: Date;
  /** Sends any waiting changes to the cloud now. Resolves true when nothing is left unsynced. */
  flush: () => Promise<boolean>;
}
const StoreCtx = createContext<Ctx | null>(null);

const SYNC_FAILED = "Cloud sync failed. Your changes are saved on this device and will sync when you are back online.";
const LOAD_FAILED = "We could not load your cloud progress. Check your connection and refresh. Nothing has been overwritten.";

export function StoreProvider({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth();
  const cloud = status === "signed-in";
  const [state, setState] = useState<RiseState | null>(null);
  const [today, setToday] = useState(() => new Date());
  const [saveFailed, setSaveFailed] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState("");
  const stateRef = useRef<RiseState | null>(null);
  const dirtyRef = useRef(false);
  const syncedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const loaded = state !== null;

  useEffect(() => {
    try {
      const local = loadEntries(localStorage);
      stateRef.current = local;
      setState(local);
    } catch {
      const empty = emptyState();
      stateRef.current = empty;
      setState(empty);
      setSaveFailed(true);
    }
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

  // Pushes run one after another so an older save can never land after a newer one.
  const flush = useCallback(() => {
    clearTimeout(pushTimer.current);
    const run = async () => {
      if (!dirtyRef.current || !syncedRef.current || !stateRef.current) return;
      dirtyRef.current = false;
      try {
        await pushState(stateRef.current);
        setSyncError("");
      } catch (e) {
        dirtyRef.current = true;
        if (e instanceof CloudError && e.authFailed) void signOut();
        else setSyncError(SYNC_FAILED);
      }
    };
    chain.current = chain.current.then(run);
    return chain.current.then(() => !dirtyRef.current);
  }, [signOut]);

  // When signed in, load the saved progress once. Cloud data wins; a brand-new account
  // starts with whatever was already on this device.
  useEffect(() => {
    if (!cloud || !loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await pullState();
        if (cancelled) return;
        if (saved) {
          dirtyRef.current = false;
          stateRef.current = saved;
          setState(saved);
        } else {
          await pushState(stateRef.current ?? emptyState());
        }
        if (cancelled) return;
        syncedRef.current = true;
        setSyncError("");
        setSynced(true);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof CloudError && e.authFailed) void signOut();
        else setSyncError(LOAD_FAILED);
      }
    })();
    return () => { cancelled = true; };
  }, [cloud, loaded, signOut]);

  useEffect(() => {
    stateRef.current = state;
    if (cloud && synced && state && dirtyRef.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => { void flush(); }, 600);
    }
  }, [state, synced, cloud, flush]);

  useEffect(() => {
    if (!cloud) return;
    const retry = () => { if (dirtyRef.current) void flush(); };
    const onHide = () => { if (document.visibilityState === "hidden") retry(); };
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    window.addEventListener("pagehide", retry);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearTimeout(pushTimer.current);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      window.removeEventListener("pagehide", retry);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [cloud, flush]);

  const update = useCallback((fn: (s: RiseState) => RiseState) => setState((s) => {
    if (!s) return s;
    const next = fn(s);
    dirtyRef.current = true;
    stateRef.current = next;
    try { saveEntries(localStorage, next); } catch { /* The effect displays storage errors. */ }
    return next;
  }), []);
  const reset = useCallback(() => update(() => emptyState()), [update]);

  if (!state || (cloud && !synced && !syncError))
    return <LoadingSkeleton />;
  return <StoreCtx.Provider value={{ state, update, reset, today, flush }}>
    {syncError && <p role="alert" className="mb-4 text-sm text-destructive">{syncError}</p>}
    {saveFailed && <p role="alert" className="mb-4 text-sm text-destructive">Your changes could not be saved in this browser. Free some storage or allow browser storage before refreshing.</p>}
    {children}
  </StoreCtx.Provider>;
}

export function useRise() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useRise outside provider");
  return c;
}
