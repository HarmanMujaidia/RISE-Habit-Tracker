import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cloudEnabled,
  consumeOAuthRedirect,
  readSession,
  signInWithGoogle,
  signInWithPassword,
  signOutRemote,
  signUpWithPassword,
} from "./cloud";
import { ENTRY_KEY } from "./rise-storage";

/** "local" means no cloud settings were provided, so the app runs on this device only. */
export type AuthStatus = "loading" | "local" | "signed-out" | "signed-in";

interface AuthCtx {
  status: AuthStatus;
  email: string;
  error: string;
  notice: string;
  signInGoogle: () => void;
  signInPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const noop = async () => {};
const LOCAL_ONLY: AuthCtx = {
  status: "local",
  email: "",
  error: "",
  notice: "",
  signInGoogle: () => {},
  signInPassword: noop,
  signUp: noop,
  signOut: noop,
};

const AuthContext = createContext<AuthCtx | null>(null);

const clean = (email: string) => email.trim().toLowerCase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!cloudEnabled) { setStatus("local"); return; }
    let active = true;
    (async () => {
      try {
        const session = (await consumeOAuthRedirect()) ?? readSession();
        if (!active) return;
        if (session) { setEmail(session.email); setStatus("signed-in"); }
        else setStatus("signed-out");
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
        setStatus("signed-out");
      }
    })();
    return () => { active = false; };
  }, []);

  const signInPassword = useCallback(async (address: string, password: string) => {
    setError(""); setNotice("");
    const session = await signInWithPassword(clean(address), password);
    setEmail(session.email);
    setStatus("signed-in");
  }, []);

  const signUp = useCallback(async (address: string, password: string) => {
    setError(""); setNotice("");
    const session = await signUpWithPassword(clean(address), password);
    if (session) { setEmail(session.email); setStatus("signed-in"); }
    else setNotice("Check your email and confirm your account, then sign in.");
  }, []);

  const signOut = useCallback(async () => {
    await signOutRemote();
    // This device should not keep the previous account's progress.
    try { localStorage.removeItem(ENTRY_KEY); } catch { /* Nothing stored to remove. */ }
    setEmail("");
    setStatus("signed-out");
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ status, email, error, notice, signInGoogle: signInWithGoogle, signInPassword, signUp, signOut }),
    [status, email, error, notice, signInPassword, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext) ?? LOCAL_ONLY;
}
