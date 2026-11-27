// User Story 6.1 - Identify a Fish Using a Photo.
//
// The app shrinks the photo, then sends it to the Django backend, which asks
// Fishial.ai to identify it. The Fishial keys stay on the server.

import { API_URL } from "../auth/accounts";
import { getSessionToken } from "../auth/session";

const SERVER_ERROR = "We can't reach the server right now. Please try again.";

// Fishial doesn't need a big photo, and a small one uploads faster.
const MAX_SIDE = 1024;

export type Identification =
  // AC3: the species, and its fish page when it's in our database
  | { kind: "identified"; scientificName: string; fish: { slug: string; commonName: string } | null }
  // AC4: no fish found, or Fishial wasn't sure enough
  | { kind: "not-identified" }
  // Fishial is down, slow, or out of credits
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

// Shrinks the photo to at most 1024 pixels on its longest side, keeping its shape
// (no cropping, so the whole fish stays in view), and saves it as a JPEG.
// Redrawing it also strips hidden photo data, like the GPS location many phones
// save inside pictures.
export async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read the photo."));
      img.src = url;
    });

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process the photo.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// AC2: sends one photo (a JPEG data URL) for identification.
export async function identifyFish(photo: string): Promise<Identification> {
  try {
    const response = await fetch(`${API_URL}/api/fish/identify/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getSessionToken()}`,
      },
      body: JSON.stringify({ photo }),
    });
    const body = await response.json();
    if (response.status !== 200) {
      // e.g. "Please sign in again." or "Please choose a JPEG photo under 1.5 MB."
      return { kind: "error", message: body.errors?.form ?? SERVER_ERROR };
    }
    if (body.identified) {
      return { kind: "identified", scientificName: body.scientificName, fish: body.fish ?? null };
    }
    return body.unavailable ? { kind: "unavailable" } : { kind: "not-identified" };
  } catch {
    return { kind: "error", message: SERVER_ERROR };
  }
}
