"use client";

import * as React from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media-url";
import {
  MAX_UPLOAD_SIZE,
  uploadExtensionForMime,
} from "@/lib/upload-config";

type UploadMode = "blob" | "local" | "unavailable";

function randomUploadName(ext: string) {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${randomId}${ext}`;
}

async function getUploadMode(): Promise<UploadMode> {
  const res = await fetch("/api/upload", { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Ошибка подготовки загрузки");
  if (data?.mode === "unavailable") {
    throw new Error("Подключите Vercel Blob Store к проекту и сделайте redeploy");
  }
  return data?.mode === "blob" ? "blob" : "local";
}

export function FileUpload({
  accept = "video/*,image/*",
  value,
  onUploaded,
  label = "Загрузить файл",
}: {
  accept?: string;
  value?: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<"idle" | "uploading" | "done" | "error">(
    value ? "done" : "idle"
  );
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState(0);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError("");
    setProgress(0);

    try {
      const ext = uploadExtensionForMime(file.type);
      if (!ext) {
        throw new Error("Допустимы только JPG, PNG, WebP, AVIF, GIF и видео MP4, WebM, OGV, MOV");
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error("Файл слишком большой (макс. 500 МБ)");
      }

      const mode = await getUploadMode();
      if (mode === "blob") {
        const blob = await uploadPresigned(`uploads/${randomUploadName(ext)}`, file, {
          access: "public",
          contentType: file.type,
          handleUploadUrl: "/api/upload",
          multipart: file.size > 4 * 1024 * 1024,
          onUploadProgress: (event) => setProgress(event.percentage),
        });

        onUploaded(mediaUrl(blob.url));
        setProgress(100);
        setStatus("done");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Ошибка загрузки");
      onUploaded(data.url);
      setProgress(100);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted",
          status === "error" && "border-destructive text-destructive"
        )}
      >
        {status === "uploading" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Загрузка
            {progress > 0 ? ` ${progress}%` : ""}...
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 className="size-4 text-success" /> Файл загружен - заменить
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="size-4" /> {error}
          </>
        ) : (
          <>
            <UploadCloud className="size-4" /> {label}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
