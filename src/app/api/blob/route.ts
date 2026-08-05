import { get } from "@vercel/blob";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";

function parseAllowedBlobUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.includes(".private.blob.")) return null;
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return null;
    if (!url.pathname.startsWith("/uploads/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Forbidden", { status: 403 });

  const url = parseAllowedBlobUrl(req.nextUrl.searchParams.get("url"));
  if (!url) return new Response("Invalid blob URL", { status: 400 });

  const range = req.headers.get("range");
  const file = await get(url, {
    access: "private",
    headers: range ? { range } : undefined,
  });
  if (!file) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": file.blob.contentType || "application/octet-stream",
    "Cache-Control": "private, max-age=300",
  });
  for (const name of ["accept-ranges", "content-length", "content-range"]) {
    const value = file.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(file.stream, {
    status: range ? 206 : 200,
    headers,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
