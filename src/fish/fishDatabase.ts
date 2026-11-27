// Loads fish species from the fish database (User Story 5.1) through the
// Django backend.

import { API_URL } from "../auth/accounts";
import { getSessionToken } from "../auth/session";

const SERVER_ERROR = "We can't reach the fish database right now. Please try again.";

// What the library grid shows for each species.
export type FishCard = {
  slug: string;
  commonName: string;
  water: "saltwater" | "freshwater"; // where Long Island anglers usually catch it
  picture: string | null;
};

// Everything stored for one species. Empty text means it hasn't been added yet.
export type FishDetails = FishCard & {
  scientificName: string;
  features: string;
  habitat: string;
  bestBait: string;
  morePictures: string[];
};

async function get<T>(path: string): Promise<{ data: T } | { error: string }> {
  try {
    const response = await fetch(`${API_URL}/api/fish/${path}`, {
      headers: { Authorization: `Bearer ${getSessionToken()}` },
    });
    const body = await response.json();
    if (response.status === 200) return { data: body.fish };
    // e.g. "Please sign in again." or "That fish isn't in the database."
    return { error: body.errors?.form ?? SERVER_ERROR };
  } catch {
    return { error: SERVER_ERROR };
  }
}

// AC1: every species in the database, in alphabetical order.
export function loadFishList() {
  return get<FishCard[]>("");
}

// AC2: the information stored for one species.
export function loadFish(slug: string) {
  return get<FishDetails>(`${encodeURIComponent(slug)}/`);
}
