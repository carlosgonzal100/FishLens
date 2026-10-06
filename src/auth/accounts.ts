// Stores registered accounts (User Story 1.2) and is used to check
// usernames and passwords at sign-in (User Story 1.3).
//
// NOTE: Accounts are saved in the browser's localStorage for now, so they only
// exist on this device and browser. Real accounts will need a backend later.

const ACCOUNTS_KEY = "fish-field-guide-accounts";

export type Account = {
  firstName: string;
  lastName: string;
  email: string; // saved in lowercase
  username: string; // saved in lowercase
  passwordHash: string; // never store the real password
};

// Turns a password into a scrambled "hash" so the real password is never saved.
export async function hashPassword(password: string): Promise<string> {
  const encodedPassword = new TextEncoder().encode(password);
  const hash = await window.crypto.subtle.digest("SHA-256", encodedPassword);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function loadAccounts(): Account[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter(
        (account) =>
          typeof account?.email === "string" &&
          typeof account?.username === "string" &&
          typeof account?.passwordHash === "string",
      )
      .map((account) => ({
        firstName: typeof account.firstName === "string" ? account.firstName : "",
        lastName: typeof account.lastName === "string" ? account.lastName : "",
        email: account.email,
        username: account.username,
        passwordHash: account.passwordHash,
      }));
  } catch {
    return [];
  }
}

export function addAccount(account: Account): void {
  const accounts = loadAccounts();
  accounts.push(account);
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}
