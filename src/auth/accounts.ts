// Registers accounts (User Story 1.2) and checks usernames and passwords at
// sign-in (User Story 1.3) through the Django backend, which saves accounts in
// MongoDB.

import { getSessionToken } from "./session";

// Uses the live backend unless VITE_API_URL says otherwise, for example
// VITE_API_URL=http://localhost:8000 to test against Django on your own computer.
const API_URL = import.meta.env.VITE_API_URL ?? "https://fish-lens-backend.vercel.app";
const SERVER_ERROR = "We can't reach the server. Please try again.";

export type Account = {
  firstName: string;
  lastName: string;
  email: string; // saved in lowercase
  username: string; // saved in lowercase
  passwordHash?: string; // the backend never sends this to the app
};

type FormErrors = Record<string, string>;

// The signed-in account, kept in memory after it's loaded from the database.
let accounts: Account[] = [];

export function loadAccounts(): Account[] {
  return accounts;
}

export function addAccount(account: Account): void {
  accounts.push(account);
}

// Sends a request to the backend. Returns the HTTP status and the response body.
async function send(path: string, options: RequestInit) {
  const response = await fetch(`${API_URL}/api/accounts/${path}`, options);
  return { status: response.status, body: await response.json() };
}

function postJson(path: string, values: Record<string, string>) {
  return send(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

// Saves a new account in the database. Returns any errors, or nothing if it worked.
export async function registerAccount(values: Record<string, string>): Promise<FormErrors> {
  try {
    const { status, body } = await postJson("register/", values);
    return status === 201 ? {} : body.errors;
  } catch {
    return { form: SERVER_ERROR };
  }
}

// Checks a username and password against the database.
export async function signInToAccount(
  username: string,
  password: string,
): Promise<{ token: string } | { error: string }> {
  try {
    const { status, body } = await postJson("sign-in/", { username, password });
    return status === 200 ? { token: body.token } : { error: body.errors.form };
  } catch {
    return { error: SERVER_ERROR };
  }
}

// Loads the signed-in account from the database, so the profile can show it.
// Returns "rejected" only when the backend says the saved token isn't valid.
export async function loadSignedInAccount(): Promise<"loaded" | "rejected" | "unreachable"> {
  try {
    const { status, body } = await send("me/", {
      headers: { Authorization: `Bearer ${getSessionToken()}` },
    });
    accounts = status === 200 ? [body.account] : [];
    if (status === 200) return "loaded";
    return status === 401 ? "rejected" : "unreachable";
  } catch {
    accounts = [];
    return "unreachable";
  }
}
