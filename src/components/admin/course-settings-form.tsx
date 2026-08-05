"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { updateCourse, deleteCourse } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mediaUrl } from "@/lib/media-url";
import { FileUpload } from "./file-upload";

type Props = {
  course: {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    published: boolean;
    restricted: boolean;
    groupCount: number;
  };
};

export function CourseSettingsForm({ course }: Props) {
  const router = useRouter();
  const [cover, setCover] = React.useState(course.coverImage ?? "");
  const coverSrc = mediaUrl(cover);
  const [published, setPublished] = React.useState(course.published);
  const [restricted, setRestricted] = React.useState(course.restricted);
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("coverImage", cover);
    if (published) fd.set("published", "on");
    else fd.delete("published");
    if (restricted) fd.set("restricted", "on");
    else fd.delete("restricted");

    start(async () => {
      const res = await updateCourse(course.id, fd);
      if (res && "error" in res && res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: "Изменения сохранены" });
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!confirm("Удалить курс со всеми модулями, уроками и тестами? Действие необратимо.")) return;
    start(async () => {
      await deleteCourse(course.id);
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
        <Label>Обложка курса</Label>
        <div className="mb-2 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt="Обложка" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-primary/15 to-fuchsia-500/15 px-4 text-center text-sm text-muted-foreground">
              <div>
                <p>Обложка не выбрана</p>
                <p className="mt-1 text-xs">
                  Рекомендуемый размер: 1920 x 1080 px (16:9), чтобы края не обрезались
                </p>
              </div>
            </div>
          )}
        </div>
        <FileUpload
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          value={cover}
          label="Загрузить обложку"
          onUploaded={setCover}
        />
        {cover && (
          <button type="button" onClick={() => setCover("")} className="mt-1.5 text-xs text-destructive hover:underline">
            Убрать обложку
          </button>
        )}
      </div>

      <div>
        <Label htmlFor="title">Название</Label>
        <Input id="title" name="title" defaultValue={course.title} required />
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea id="description" name="description" defaultValue={course.description} rows={5} />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        <div>
          <p className="text-sm font-medium">Опубликован</p>
          <p className="text-xs text-muted-foreground">Виден студентам в каталоге</p>
        </div>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={restricted}
          onChange={(e) => setRestricted(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <div>
          <p className="text-sm font-medium">Доступ только для групп</p>
          <p className="text-xs text-muted-foreground">
            {restricted
              ? course.groupCount > 0
                ? `Курс видят только участники назначенных групп (${course.groupCount}). Настроить — в разделе «Группы».`
                : "Внимание: группы курсу не назначены, поэтому его сейчас не видит ни один студент."
              : "Выключено — курс доступен всем студентам сразу после регистрации."}
          </p>
        </div>
      </label>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" /> Удалить курс
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Сохранить
        </Button>
      </div>
    </form>
  );
}
