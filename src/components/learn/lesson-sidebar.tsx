"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, PlayCircle, FileText, Menu, X, ClipboardCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type LessonItem = {
  id: string;
  slug: string;
  title: string;
  hasVideo: boolean;
  hasTest: boolean;
};
type ModuleItem = { id: string; title: string; lessons: LessonItem[] };

type Props = {
  courseSlug: string;
  courseTitle: string;
  modules: ModuleItem[];
  completedIds: string[];
  percent: number;
};

export function LessonSidebar({
  courseSlug,
  courseTitle,
  modules,
  completedIds,
  percent,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const done = new Set(completedIds);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg lg:hidden"
      >
        <Menu className="size-4" /> Программа
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-full lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border p-4">
          <div className="min-w-0">
            <Link
              href={`/courses/${courseSlug}`}
              className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              К странице курса
            </Link>
            <h2 className="mt-1 truncate font-semibold" title={courseTitle}>
              {courseTitle}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть программу курса"
            className="rounded-md p-1 hover:bg-muted lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Прогресс курса</span>
            <span className="font-medium text-foreground">{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {modules.map((m, mi) => (
            <div key={m.id} className="mb-4">
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mi + 1}. {m.title}
              </p>
              <ul className="space-y-0.5">
                {m.lessons.map((l) => {
                  const href = `/learn/${courseSlug}/${l.slug}`;
                  const active = pathname === href;
                  const isDone = done.has(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                        ) : active ? (
                          <PlayCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1">{l.title}</span>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-muted-foreground">
                          {l.hasVideo && <PlayCircle className="size-3.5" />}
                          {l.hasTest && <ClipboardCheck className="size-3.5" />}
                          {!l.hasVideo && !l.hasTest && <FileText className="size-3.5" />}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
