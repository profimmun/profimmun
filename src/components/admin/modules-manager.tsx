"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  FileText,
  PlayCircle,
  ClipboardCheck,
  Loader2,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  X,
  Check,
} from "lucide-react";
import {
  createModule,
  deleteModule,
  updateModule,
  createLesson,
  deleteLesson,
  reorderLessons,
  reorderModules,
} from "@/lib/admin-actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  title: string;
  hasVideo: boolean;
  hasTest: boolean;
  published: boolean;
};
type ModuleT = { id: string; title: string; lessons: Lesson[] };

/**
 * Кнопка «добавить по клику»: в свёрнутом виде — спокойная пунктирная кнопка,
 * по клику раскрывается в инлайн-поле с подтверждением/отменой. Так действие
 * читается как действие, а не как случайное пустое поле ввода.
 */
function AddInline({
  label,
  placeholder,
  onAdd,
  icon: Icon = Plus,
  variant = "muted",
  pending,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
  icon?: typeof Plus;
  variant?: "muted" | "accent";
  pending?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variant === "accent"
            ? "border-primary/40 text-primary hover:bg-accent"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        placeholder={placeholder}
        className="h-9 min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || pending}
        title="Добавить"
        className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setValue("");
        }}
        title="Отмена"
        className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ModulesManager({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleT[];
}) {
  const router = useRouter();
  const [mods, setMods] = React.useOptimistic(
    modules,
    (_currentMods, nextMods: ModuleT[]) => nextMods
  );
  const [pending, start] = React.useTransition();

  function addModule(title: string) {
    const fd = new FormData();
    fd.set("title", title);
    start(async () => {
      await createModule(courseId, fd);
      router.refresh();
    });
  }

  function moveModule(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= mods.length) return;
    const next = [...mods];
    [next[index], next[target]] = [next[target], next[index]];
    start(async () => {
      setMods(next);
      await reorderModules(courseId, next.map((m) => m.id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {mods.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <FolderPlus className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="font-medium">Начните с модуля</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Модуль — это раздел курса. Внутри модуля добавляются уроки. Создайте
            первый модуль, чтобы наполнить программу.
          </p>
        </div>
      )}

      {mods.map((m, mi) => (
        <ModuleCard
          key={m.id}
          module={m}
          index={mi}
          total={mods.length}
          courseId={courseId}
          onMove={moveModule}
        />
      ))}

      {/* Добавление модуля — отдельное действие на уровне всего курса */}
      <AddInline
        label="Добавить модуль"
        placeholder="Название модуля, например «Введение»"
        onAdd={addModule}
        icon={FolderPlus}
        variant="accent"
        pending={pending}
      />
    </div>
  );
}

function ModuleCard({
  module: m,
  index,
  total,
  courseId,
  onMove,
}: {
  module: ModuleT;
  index: number;
  total: number;
  courseId: string;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(m.title);
  const [lessons, setLessons] = React.useOptimistic(
    m.lessons,
    (_currentLessons, nextLessons: Lesson[]) => nextLessons
  );
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function saveTitle() {
    setEditing(false);
    if (title.trim() && title !== m.title) {
      start(async () => {
        await updateModule(m.id, courseId, title.trim());
        router.refresh();
      });
    } else {
      setTitle(m.title);
    }
  }

  function removeModule() {
    if (!confirm(`Удалить модуль «${m.title}» со всеми уроками?`)) return;
    start(async () => {
      await deleteModule(m.id, courseId);
      router.refresh();
    });
  }

  function addLesson(title: string) {
    const fd = new FormData();
    fd.set("title", title);
    start(async () => {
      await createLesson(m.id, courseId, fd); // редиректит в редактор урока
    });
  }

  function removeLesson(lessonId: string, t: string) {
    if (!confirm(`Удалить урок «${t}»?`)) return;
    const next = lessons.filter((l) => l.id !== lessonId);
    start(async () => {
      setLessons(next);
      await deleteLesson(lessonId, courseId);
      router.refresh();
    });
  }

  function persistOrder(next: Lesson[]) {
    start(async () => {
      setLessons(next);
      await reorderLessons(m.id, courseId, next.map((l) => l.id));
      router.refresh();
    });
  }

  function moveLesson(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= lessons.length) return;
    const next = [...lessons];
    [next[i], next[target]] = [next[target], next[i]];
    persistOrder(next);
  }

  function onDragOver(overId: string) {
    if (!dragId || dragId === overId) return;
    const from = lessons.findIndex((l) => l.id === dragId);
    const to = lessons.findIndex((l) => l.id === overId);
    if (from === -1 || to === -1) return;
    const next = [...lessons];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    start(() => setLessons(next));
  }

  function onDrop() {
    if (dragId) persistOrder(lessons);
    setDragId(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Заголовок модуля */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 p-3">
        <div className="flex flex-col">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Поднять модуль"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Опустить модуль"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {index + 1}
        </span>
        {editing ? (
          <Input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="h-8 min-w-0"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="group flex min-w-0 flex-1 items-center gap-2 text-left"
            title="Переименовать модуль"
          >
            <span className="truncate font-semibold">{m.title}</span>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {lessons.length > 0 && `${lessons.length} ур.`}
        </span>
        <button
          onClick={removeModule}
          disabled={pending}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Удалить модуль"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Уроки — вложены в модуль, с левой направляющей */}
      <div className="p-3">
        {lessons.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">
            В этом модуле пока нет уроков.
          </p>
        ) : (
          <ul className="space-y-1 border-l-2 border-border pl-3">
            {lessons.map((l, li) => (
              <li
                key={l.id}
                draggable
                onDragStart={() => setDragId(l.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOver(l.id);
                }}
                onDragEnd={onDrop}
                onDrop={onDrop}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                  dragId === l.id ? "bg-accent/60 opacity-60" : "hover:bg-muted/50"
                )}
              >
                <span
                  className="hidden cursor-grab touch-none text-muted-foreground active:cursor-grabbing sm:block"
                  title="Перетащите, чтобы изменить порядок"
                >
                  <GripVertical className="size-4" />
                </span>
                <div className="flex flex-col sm:hidden">
                  <button
                    onClick={() => moveLesson(li, -1)}
                    disabled={li === 0}
                    className="text-muted-foreground disabled:opacity-30"
                    title="Выше"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => moveLesson(li, 1)}
                    disabled={li === lessons.length - 1}
                    className="text-muted-foreground disabled:opacity-30"
                    title="Ниже"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                {l.hasVideo ? (
                  <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                )}
                <Link
                  href={`/admin/courses/${courseId}/lessons/${l.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                >
                  {l.title}
                </Link>
                {l.hasTest && (
                  <span title="К уроку добавлен тест" className="shrink-0">
                    <ClipboardCheck className="size-4 text-primary" />
                  </span>
                )}
                {!l.published && (
                  <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
                    черновик
                  </span>
                )}
                <Link
                  href={`/admin/courses/${courseId}/lessons/${l.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                  title="Редактировать урок"
                >
                  <Pencil className="size-3.5" />
                  <span className="hidden sm:inline">Редактировать</span>
                </Link>
                <button
                  onClick={() => removeLesson(l.id, l.title)}
                  disabled={pending}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Удалить урок"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Добавление урока — внутри модуля, с отступом под уроки */}
        <div className="mt-2 pl-3">
          <AddInline
            label="Добавить урок"
            placeholder="Название урока"
            onAdd={addLesson}
            pending={pending}
          />
        </div>
      </div>
    </div>
  );
}
