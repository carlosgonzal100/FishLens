// Remembers whether someone is signed in, so they stay signed in after
// closing and reopening the app (User Story 1.1).
//
// NOTE: This is saved in the browser's localStorage, so it only works on this
// device and browser. Real accounts will need a backend later.

const SESSION_KEY = "fish-field-guide-authenticated";

export function isSignedIn(): boolean {
  try {
    return window.localStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function startSession(): void {
  try {
    window.localStorage.setItem(SESSION_KEY, "true");
  } catch {
    // Storage unavailable (e.g. private browsing); the user stays signed in
    // only until the page is closed.
  }
}

export function endSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}
