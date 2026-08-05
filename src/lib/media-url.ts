export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname.includes(".private.blob.") &&
      parsed.hostname.endsWith(".blob.vercel-storage.com")
    ) {
      return `/api/blob?url=${encodeURIComponent(parsed.toString())}`;
    }
  } catch {
    // Relative uploads and manually entered URLs are already usable as-is.
  }

  return url;
}
