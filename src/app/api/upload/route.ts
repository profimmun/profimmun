import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { issueSignedToken, put } from "@vercel/blob";
import { handleUploadPresigned } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { hit, clientIp, formatRetryAfter } from "@/lib/rate-limit";
import {
  allowedUploadExtensions,
  allowedUploadTypes,
  MAX_UPLOAD_SIZE,
  uploadExtensionForMime,
  uploadKindForMime,
} from "@/lib/upload-config";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isBlobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return isVercelRuntime() && Boolean(process.env.BLOB_STORE_ID?.trim());
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

function blobSetupError() {
  if (isVercelRuntime()) {
    return "Подключите Vercel Blob Store к проекту и сделайте redeploy";
  }
  return "Blob-хранилище не настроено. Для локальной загрузки задайте BLOB_READ_WRITE_TOKEN";
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

async function checkUploadRateLimit(userId: string) {
  const ip = await clientIp();
  return hit(`upload:${userId}:${ip}`, 30, 60 * 60_000);
}

function sniff(buf: Buffer): "image" | "video" | null {
  if (buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");

  if (hex.startsWith("ffd8ff")) return "image";
  if (hex.startsWith("89504e470d0a1a0a")) return "image";
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image";
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12);
    return brand.startsWith("avif") || brand.startsWith("avis") ? "image" : "video";
  }
  if (hex.startsWith("1a45dfa3")) return "video";
  if (ascii.startsWith("OggS")) return "video";
  return null;
}

function randomUploadName(ext: string) {
  return `${crypto.randomBytes(16).toString("hex")}${ext}`;
}

async function handleLocalUpload(req: Request) {
  if (isVercelRuntime() && !isBlobConfigured()) {
    return jsonError(blobSetupError(), 503);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Файл не передан", 400);
  }

  const ext = uploadExtensionForMime(file.type);
  if (!ext) {
    return jsonError(
      "Допустимы только JPG, PNG, WebP, AVIF, GIF и видео MP4, WebM, OGV, MOV",
      415
    );
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return jsonError("Файл слишком большой (макс. 500 МБ)", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  const declared = uploadKindForMime(file.type);
  if (kind !== declared) {
    return jsonError("Содержимое файла не соответствует его типу", 415);
  }

  const name = randomUploadName(ext);
  if (isBlobConfigured()) {
    const blob = await put(`uploads/${name}`, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ url: blob.url });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, name), buffer);

  return NextResponse.json({ url: `/uploads/${name}` });
}

async function handleBlobPresignedUpload(req: Request) {
  if (!isBlobConfigured()) {
    return jsonError(blobSetupError(), 400);
  }

  const body = await req.json();
  const response = await handleUploadPresigned({
    body,
    request: req,
    getSignedToken: async (pathname) => {
      if (!pathname.startsWith("uploads/")) {
        throw new Error("Недопустимый путь загрузки");
      }

      const ext = path.extname(pathname).toLowerCase();
      if (!allowedUploadExtensions().includes(ext)) {
        throw new Error("Недопустимый тип файла");
      }

      const validUntil = Date.now() + 60 * 60 * 1000;
      const constraints = {
        allowedContentTypes: allowedUploadTypes(),
        maximumSizeInBytes: MAX_UPLOAD_SIZE,
        validUntil,
      };

      return {
        token: await issueSignedToken({
          pathname,
          operations: ["put"],
          ...constraints,
        }),
        urlOptions: {
          ...constraints,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        },
      };
    },
  });

  return NextResponse.json(response);
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return jsonError("Нет доступа", 403);

  return NextResponse.json({
    mode: isBlobConfigured() ? "blob" : isVercelRuntime() ? "unavailable" : "local",
    maxSize: MAX_UPLOAD_SIZE,
    allowedTypes: allowedUploadTypes(),
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return jsonError("Нет доступа", 403);

    const gate = await checkUploadRateLimit(user.id);
    if (!gate.ok) {
      return jsonError(
        `Слишком много загрузок. Повторите через ${formatRetryAfter(gate.retryAfterSec)}`,
        429
      );
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return handleBlobPresignedUpload(req);
    }

    return handleLocalUpload(req);
  } catch (error) {
    console.error("upload failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Ошибка загрузки файла",
      500
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
