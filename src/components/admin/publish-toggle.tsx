"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { togglePublish } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

/**
 * Переключатель публикации курса вместе с подписью.
 *
 * Геометрия: дорожка 44×24, кружок 20 — значит отступ 2px со всех сторон,
 * а ход равен 44 − 20 − 2·2 = 20px, то есть от 2px до 22px.
 *
 * Подпись держится внутри компонента (а не в родителе), чтобы она менялась
 * вместе с оптимистичным состоянием, и имеет фиксированную ширину — иначе
 * «Опубликован» / «Черновик» разной длины дёргали бы соседние элементы.
 */
export function PublishToggle({
  courseId,
  published,
  showLabel = true,
}: {
  courseId: string;
  published: boolean;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = React.useOptimistic(published, (_current, next: boolean) => next);
  const [pending, start] = React.useTransition();

  function toggle() {
    const next = !on;
    start(async () => {
      setOn(next);
      await togglePublish(courseId, next);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        role="switch"
        aria-checked={on}
        aria-label={on ? "Снять с публикации" : "Опубликовать курс"}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          "disabled:cursor-not-allowed disabled:opacity-60",
          on ? "bg-success" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
            on ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>

      {showLabel && (
        <span
          className={cn(
            "inline-flex w-[7.25rem] shrink-0 justify-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          )}
        >
          {on ? "Опубликован" : "Черновик"}
        </span>
      )}
    </span>
  );
}
