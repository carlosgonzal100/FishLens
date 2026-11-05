// Catches a user has recorded. Used by the profile's fishing summary and
// Catch History tab (User Story 2.1).
//
// NOTE: There's no way to record a catch yet, so lists start empty. Catches are
// saved in localStorage, one list per user, until the backend
// (Django + MongoDB) exists.

const CATCHES_KEY = "fish-field-guide-catches";

export type Catch = {
  id: string;
  species: string;
  weightLb: number;
  location: string;
  caughtAt: string; // date only, e.g. "2026-08-17"
};

export type CatchSummary = {
  totalCaught: number;
  biggest: Catch | null;
};

function isCatch(value: unknown): value is Catch {
  const c = value as Catch;
  return (
    typeof c?.id === "string" &&
    typeof c?.species === "string" &&
    typeof c?.weightLb === "number" &&
    typeof c?.location === "string" &&
    typeof c?.caughtAt === "string"
  );
}

function loadAll(): Record<string, unknown> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CATCHES_KEY) ?? "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

// Each user's catches are stored under their own username, so one user
// never loads another user's catches.
export function loadCatches(username: string): Catch[] {
  const all = loadAll();
  const mine = Object.prototype.hasOwnProperty.call(all, username) ? all[username] : [];
  return Array.isArray(mine) ? mine.filter(isCatch) : [];
}

export function saveCatches(username: string, catches: Catch[]): void {
  try {
    const all = loadAll();
    all[username] = catches;
    window.localStorage.setItem(CATCHES_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable; nothing is saved.
  }
}

// AC: the fishing summary shows the number of fish caught and the biggest fish.
export function summarizeCatches(catches: Catch[]): CatchSummary {
  let biggest: Catch | null = null;
  for (const c of catches) {
    if (!biggest || c.weightLb > biggest.weightLb) biggest = c;
  }
  return { totalCaught: catches.length, biggest };
}
