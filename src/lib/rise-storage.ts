import { emptyState, type RiseState } from "./rise";

export const ENTRY_KEY = "rise-user-entries-v2";
export const LEGACY_KEY = "rise-state-v1";

export function loadEntries(storage: Pick<Storage, "getItem" | "removeItem">): RiseState {
  storage.removeItem(LEGACY_KEY);
  try {
    const raw = storage.getItem(ENTRY_KEY);
    if (!raw) return emptyState();
    const value = JSON.parse(raw) as RiseState;
    if (!Array.isArray(value.habits) || !Array.isArray(value.tasks) || !Array.isArray(value.dreams) || !value.logs || typeof value.logs !== "object" || Array.isArray(value.logs)) return emptyState();
    return value;
  } catch {
    return emptyState();
  }
}

export function saveEntries(storage: Pick<Storage, "setItem" | "removeItem">, state: RiseState) {
  storage.removeItem(LEGACY_KEY);
  storage.setItem(ENTRY_KEY, JSON.stringify(state));
}