"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Trash2, PlayCircle, Video, Film } from "lucide-react";
import { updateLesson, deleteLesson } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./file-upload";
import { VideoPlayer } from "@/components/learn/video-player";

type VideoType = "NONE" | "YOUTUBE" | "VIMEO" | "UPLOAD";

type Props = {
  lesson: {
    id: string;
    courseId: string;
    title: string;
    content: string;
    videoType: VideoType;
    videoUrl: string | null;
    published: boolean;
  };
};

export function LessonEditForm({ lesson }: Props) {
  const router = useRouter();
  const [videoType, setVideoType] = React.useState<VideoType>(lesson.videoType);
  const [videoUrl, setVideoUrl] = React.useState(lesson.videoUrl ?? "");
  const [published, setPublished] = React.useState(lesson.published);
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("videoType", videoType);
    fd.set("videoUrl", videoType === "NONE" ? "" : videoUrl);
    if (published) fd.set("published", "on");

    start(async () => {
      const res = await updateLesson(lesson.id, lesson.courseId, fd);
      if (res && "error" in res && res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: "Урок сохранён" });
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!confirm("Удалить урок?")) return;
    start(async () => {
      await deleteLesson(lesson.id, lesson.courseId);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {msg && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            msg.type === "ok" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {msg.type === "ok" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {msg.text}
        </div>
      )}

      <div>
        <Label htmlFor="title">Название урока</Label>
        <Input id="title" name="title" defaultValue={lesson.title} required />
      </div>

      {/* Видео */}
      <div className="rounded-lg border border-border p-4">
        <Label>Видео урока</Label>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            { v: "NONE", label: "Нет", icon: null },
            { v: "YOUTUBE", label: "YouTube", icon: PlayCircle },
            { v: "VIMEO", label: "Vimeo", icon: Video },
            { v: "UPLOAD", label: "Файл", icon: Film },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setVideoType(opt.v)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border p-2.5 text-center text-xs transition-colors ${
                videoType === opt.v
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {opt.icon && <opt.icon className="size-4" />}
              {opt.label}
            </button>
          ))}
        </div>

        {(videoType === "YOUTUBE" || videoType === "VIMEO") && (
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={
              videoType === "YOUTUBE"
                ? "https://www.youtube.com/watch?v=..."
                : "https://vimeo.com/..."
            }
          />
        )}

        {videoType === "UPLOAD" && (
          <FileUpload
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            value={videoUrl}
            label="Загрузить видеофайл"
            onUploaded={setVideoUrl}
          />
        )}

        {videoType !== "NONE" && videoUrl && (
          <div className="mt-3 max-w-md">
            <VideoPlayer videoType={videoType} videoUrl={videoUrl} />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="content">Содержание урока</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={lesson.content}
          rows={12}
          className="font-mono text-sm"
          placeholder={"## Заголовок\n\nТекст урока. Поддерживается **жирный**, *курсив*, списки, [ссылки](https://...) и `код`."}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        <div>
          <p className="text-sm font-medium">Урок опубликован</p>
          <p className="text-xs text-muted-foreground">Доступен студентам курса</p>
        </div>
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onDelete} className="justify-center text-destructive hover:bg-destructive/10 sm:justify-start">
          <Trash2 className="size-4" /> Удалить урок
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Сохранить урок
        </Button>
      </div>
    </form>
  );
}
