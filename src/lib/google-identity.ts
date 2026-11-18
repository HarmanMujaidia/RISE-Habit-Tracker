// Google's own sign-in button. Its pop-up names this website instead of the Supabase address.

interface CredentialResponse { credential?: string }
interface GoogleId {
  initialize(config: { client_id: string; callback: (r: CredentialResponse) => void; nonce: string; auto_select: boolean; ux_mode: "popup"; use_fedcm_for_prompt: boolean }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId> | null = null;

/** Loads Google's sign-in script once. Rejects when it cannot load, so the caller can fall back. */
export function loadGoogleIdentity(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id); else reject(new Error("Google sign-in did not start."));
    };
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(script);
  }).catch((e: unknown) => { loading = null; throw e; });
  return loading;
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

/** A one-time value: Google gets its SHA-256 hash, Supabase gets the original, so a stolen token cannot be replayed. */
export async function makeNonce() {
  const raw = hex(crypto.getRandomValues(new Uint8Array(32)));
  const hashed = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))));
  return { raw, hashed };
}
