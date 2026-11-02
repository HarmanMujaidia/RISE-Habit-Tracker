import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/rise/LoadingSkeleton";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <div className="p-6"><LoadingSkeleton /></div>;
  if (status === "signed-out") return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const { signInGoogle, signInPassword, signUp, error, notice } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const signingUp = mode === "signup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem("");
    try {
      if (signingUp) await signUp(email, password);
      else await signInPassword(email, password);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const message = problem || error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl text-primary-foreground">↑</span>
          <h1 className="font-serif text-3xl font-semibold">Rise</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to keep your habits, plans and dreams in sync on every device.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Button type="button" variant="outline" className="w-full" onClick={signInGoogle}>Continue with Google</Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input id="auth-password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}</Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => { setMode(signingUp ? "signin" : "signup"); setProblem(""); }}
          >
            {signingUp ? "Already have an account? Sign in" : "New to Rise? Create an account"}
          </button>
        </div>
      </div>
    </main>
  );
}
