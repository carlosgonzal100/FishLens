// The signed-in user's profile (User Story 2.1).
//
// Only the fields the profile screen needs are returned. The email and
// password hash stay out of the UI on purpose.

import { loadAccounts, updateAccountName } from "../auth/accounts";
import { getSignedInUsername } from "../auth/session";
import { validateName } from "../auth/validation";

export type Profile = {
  firstName: string;
  lastName: string;
  username: string;
};

// The signed-in user's profile, or null if we can't tell who is signed in.
export function getCurrentProfile(): Profile | null {
  const username = getSignedInUsername();
  if (!username) return null;

  const account = loadAccounts().find((a) => a.username === username);
  if (!account) return null;

  return {
    firstName: account.firstName,
    lastName: account.lastName,
    username: account.username,
  };
}

// Shown in the profile picture circle until a real picture is set (Story 2.2).
export function getInitials(profile: Profile): string {
  return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toLocaleUpperCase();
}

export type NameErrors = Partial<Record<"form" | "firstName" | "lastName", string>>;

// User Story 2.3: checks the new name, then saves it to the database.
// Returns an empty object on success, or the errors to show.
export async function saveProfileName(firstName: string, lastName: string): Promise<NameErrors> {
  const first = firstName.trim();
  const last = lastName.trim();

  // AC: an invalid name is not saved, and the user sees the rule. Checking here
  // gives instant feedback; the backend checks again because browser code
  // can be bypassed.
  const errors: NameErrors = {};
  const firstError = validateName(first, "First name");
  const lastError = validateName(last, "Last name");
  if (firstError) errors.firstName = firstError;
  if (lastError) errors.lastName = lastError;
  if (firstError || lastError) return errors;

  return updateAccountName(first, last);
}
