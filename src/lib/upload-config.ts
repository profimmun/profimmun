export const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov",
};

export function uploadExtensionForMime(type: string): string | null {
  return ALLOWED_UPLOAD_TYPES[type] ?? null;
}

export function uploadKindForMime(type: string): "image" | "video" | null {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return null;
}

export function allowedUploadTypes(): string[] {
  return Object.keys(ALLOWED_UPLOAD_TYPES);
}

export function allowedUploadExtensions(): string[] {
  return [...new Set(Object.values(ALLOWED_UPLOAD_TYPES))];
}
