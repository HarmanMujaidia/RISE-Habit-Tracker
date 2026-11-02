import type { RiseState } from "./rise";
import { parseState } from "./rise-storage";

// Talks to Supabase through its plain REST API, so the app needs no extra packages.
// Both values are public by design (the anon key is protected by row level security).
const env = import.meta.env as Record<string, string | undefined>;
// Only the site address matters, so a pasted ".../rest/v1/" or trailing slash is harmless.
function originOf(value: string) {
  try { return new URL(value.trim()).origin; } catch { return ""; }
}
const BASE = originOf(env["VITE_SUPABASE_URL"] ?? "");
const KEY = (env["VITE_SUPABASE_ANON_KEY"] ?? "").trim();

/** False when the Supabase settings are missing: the app then works on this device only. */
export const cloudEnabled = BASE.startsWith("https://") && KEY.length > 20;

export const SESSION_KEY = "rise-auth-session-v1";

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  userId: string;
  email: string;
}

export class CloudError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CloudError";
    this.status = status;
  }
  get authFailed() {
    return this.status === 401 || this.status === 403;
  }
}

interface TokenBody {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id?: string; email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
}

async function request(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  // Newer publishable keys are not tokens, so only a signed-in person's token goes in Authorization.
  return fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      apikey: KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });
}

async function readBody(res: Response): Promise<TokenBody> {
  try {
    return (await res.json()) as TokenBody;
  } catch {
    return {};
  }
}

function friendlyMessage(body: TokenBody, status: number) {
  const raw = body.error_description ?? body.msg ?? body.message ?? body.error ?? "";
  if (/invalid login credentials/i.test(raw)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(raw)) return "Please confirm your email first, then sign in.";
  if (/already registered|already been registered/i.test(raw)) return "That email already has an account. Try signing in.";
  if (/password should be at least/i.test(raw)) return "Use a password with at least 6 characters.";
  if (/rate limit|too many/i.test(raw)) return "Too many attempts. Please wait a minute and try again.";
  return raw || `Something went wrong (${status}). Please try again.`;
}

function toSession(body: TokenBody, fallbackUser?: Session): Session | null {
  const user = body.user ?? (fallbackUser ? { id: fallbackUser.userId, email: fallbackUser.email } : undefined);
  if (!body.access_token || !body.refresh_token || !user?.id) return null;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at ?? Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600),
    userId: user.id,
    email: user.email ?? "",
  };
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (!s.accessToken || !s.refreshToken || !s.userId || typeof s.expiresAt !== "number") return null;
    return { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, userId: s.userId, email: s.email ?? "" };
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Sign-in then lasts until the page closes. */ }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Nothing to clear. */ }
}

export function signInWithGoogle() {
  const redirect = encodeURIComponent(window.location.origin);
  // A browser redirect cannot send headers, so the project key goes in the link.
  window.location.assign(`${BASE}/auth/v1/authorize?provider=google&redirect_to=${redirect}&apikey=${encodeURIComponent(KEY)}`);
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const res = await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const body = await readBody(res);
  const session = res.ok ? toSession(body) : null;
  if (!session) throw new CloudError(friendlyMessage(body, res.status), res.status);
  writeSession(session);
  return session;
}

/** Returns the new session, or null when the person must confirm their email first. */
export async function signUpWithPassword(email: string, password: string): Promise<Session | null> {
  const res = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  const body = await readBody(res);
  if (!res.ok) throw new CloudError(friendlyMessage(body, res.status), res.status);
  const session = toSession(body);
  if (session) writeSession(session);
  return session;
}

let redirectResult: Promise<Session | null> | null = null;

async function finishRedirect(): Promise<Session | null> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const failure = hash.get("error_description") ?? query.get("error_description");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!failure && !accessToken) return null;

  // Remove the tokens from the address bar straight away.
  window.history.replaceState(null, "", window.location.pathname);
  if (failure) throw new CloudError(failure.replace(/\+/g, " "), 400);
  if (!accessToken || !refreshToken) return null;

  const res = await request("/auth/v1/user", { token: accessToken });
  const user = (await readBody(res)) as { id?: string; email?: string };
  if (!res.ok || !user.id) throw new CloudError("Google sign-in could not be completed. Please try again.", res.status);
  const expiresIn = Number(hash.get("expires_in") ?? 3600);
  const session: Session = {
    accessToken,
    refreshToken,
    expiresAt: Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn,
    userId: user.id,
    email: user.email ?? "",
  };
  writeSession(session);
  return session;
}

/** Picks up the sign-in that Google sends back to the page. Safe to call more than once. */
export function consumeOAuthRedirect(): Promise<Session | null> {
  if (!redirectResult) redirectResult = finishRedirect();
  return redirectResult;
}

export async function signOutRemote() {
  const session = readSession();
  clearSession();
  if (!session) return;
  try { await request("/auth/v1/logout", { method: "POST", token: session.accessToken }); } catch { /* Already signed out on this device. */ }
}

let refreshing: Promise<Session> | null = null;

async function refresh(session: Session): Promise<Session> {
  const res = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refreshToken }) });
  const body = await readBody(res);
  const next = res.ok ? toSession(body, session) : null;
  if (!next) {
    if (res.status === 400 || res.status === 401) {
      clearSession();
      throw new CloudError("Your session expired. Please sign in again.", 401);
    }
    throw new CloudError("Could not reach the server.", res.status);
  }
  writeSession(next);
  return next;
}

async function validSession(): Promise<Session> {
  const session = readSession();
  if (!session) throw new CloudError("Please sign in again.", 401);
  if (session.expiresAt - Math.floor(Date.now() / 1000) > 60) return session;
  if (!refreshing) refreshing = refresh(session).finally(() => { refreshing = null; });
  return refreshing;
}

/** Loads the saved progress. Returns null when this account has nothing saved yet. */
export async function pullState(): Promise<RiseState | null> {
  const session = await validSession();
  const res = await request(`/rest/v1/rise_states?select=data&user_id=eq.${encodeURIComponent(session.userId)}`, { token: session.accessToken });
  if (!res.ok) throw new CloudError("Could not load your saved progress.", res.status);
  const rows = (await res.json()) as { data?: unknown }[];
  const row = rows[0];
  if (!row) return null;
  const state = parseState(row.data);
  // Never treat unreadable cloud data as empty: that would overwrite it on the next save.
  if (!state) throw new CloudError("Your saved progress could not be read.", 422);
  return state;
}

export async function pushState(state: RiseState): Promise<void> {
  const session = await validSession();
  const body = JSON.stringify({ user_id: session.userId, data: state, updated_at: new Date().toISOString() });
  const res = await request("/rest/v1/rise_states?on_conflict=user_id", {
    method: "POST",
    token: session.accessToken,
    // Browsers reject keepalive requests over 64 KB, so only ask for it on small saves.
    keepalive: new TextEncoder().encode(body).length < 60_000,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body,
  });
  if (!res.ok) throw new CloudError("Could not save your progress.", res.status);
}
