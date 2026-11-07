// Remembers whether someone is signed in, and who, so they stay signed in after
// closing and reopening the app (User Story 1.1) and their profile can be
// shown (User Story 2.1).
//
// NOTE: This is the one thing the browser keeps. Accounts are in the database,
// and the token proves to the backend who is signed in.

const SESSION_KEY = "fish-field-guide-authenticated";
const USER_KEY = "fish-field-guide-current-user";
const TOKEN_KEY = "fish-field-guide-token";

export function isSignedIn(): boolean {
  try {
    return window.localStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

// username is optional so existing callers (and tests) keep working.
export function startSession(username?: string): void {
  try {
    window.localStorage.setItem(SESSION_KEY, "true");
    if (username) {
      window.localStorage.setItem(USER_KEY, username.toLocaleLowerCase());
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Storage unavailable (e.g. private browsing); the user stays signed in
    // only until the page is closed.
  }
}

// The username of whoever is signed in, or null if nobody is (or if they
// signed in before usernames were saved).
export function getSignedInUsername(): string | null {
  try {
    if (!isSignedIn()) return null;
    return window.localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable; the profile can't be loaded after this.
  }
}

export function getSessionToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function endSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}
