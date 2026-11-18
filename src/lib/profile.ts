/** The first name from a Google (or other provider) profile, or "" when there is none. */
export function firstName(user?: { user_metadata?: Record<string, unknown> | undefined } | undefined): string {
  const meta = user?.user_metadata;
  const raw = [meta?.given_name, meta?.full_name, meta?.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return (raw?.trim().split(/\s+/)[0] ?? "").slice(0, 40);
}
