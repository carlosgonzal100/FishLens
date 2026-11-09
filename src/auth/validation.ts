// Shared validation rules. Register (User Story 1.2) and Edit Profile
// (User Story 2.3) both use these, so the two screens can't drift apart.
// The backend checks the same rules again in backend/accounts/views.py.

// AC (1.2 and 2.3): a first or last name must be 3–20 letters, with no
// numbers or special symbols. \p{L} means "any letter," including accented
// letters like é.
const VALID_NAME = /^\p{L}{3,20}$/u;

export type NameLabel = "First name" | "Last name";

// Returns an error message, or null if the name is valid.
export function validateName(name: string, label: NameLabel): string | null {
  return VALID_NAME.test(name) ? null : `${label} must contain 3 to 20 letters only.`;
}
