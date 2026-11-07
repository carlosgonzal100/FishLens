// The signed-in user's profile (User Story 2.1).
//
// Only the fields the profile screen needs are returned. The email and
// password hash stay out of the UI on purpose.

import { loadAccounts } from "../auth/accounts";
import { getSignedInUsername } from "../auth/session";

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
