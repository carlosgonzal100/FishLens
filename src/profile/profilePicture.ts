// Profile pictures (User Story 2.2).
//
// The app shrinks each picture to a small JPEG before uploading it, and the
// backend saves it in MongoDB. The backend checks every picture again.

import { loadAccounts } from "../auth/accounts";
import { getSignedInUsername } from "../auth/session";

const SAVED_FORMAT = "data:image/jpeg;base64,";

// SVG is left out on purpose: SVG files can contain scripts.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Returns an error message, or null if the file is OK to use.
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Please choose an image smaller than 10 MB.";
  }
  return null;
}

// Crops the image to a square and shrinks it to size×size pixels.
// Redrawing it also strips hidden photo data, like the GPS location
// many phones save inside pictures.
export async function resizeImage(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read the image."));
      img.src = url;
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process the image.");

    context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The signed-in user's picture, or null if they don't have one.
export function getCurrentPicture(): string | null {
  const username = getSignedInUsername();
  const picture = loadAccounts().find((a) => a.username === username)?.profilePicture;
  return typeof picture === "string" && picture.startsWith(SAVED_FORMAT) ? picture : null;
}
