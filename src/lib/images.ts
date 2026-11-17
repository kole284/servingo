/** Restaurant and dish photos uploaded from the admin to Vercel Blob. */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Only our own public Blob store is accepted as an image address. */
export const isBlobImageUrl = (value: string) =>
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(restorani|stavke)\/[\w./-]+$/i.test(value);
