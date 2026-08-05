"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ArrowRight, Loader2 } from "lucide-react";
import { setLessonComplete } from "@/lib/course-actions";
import { Button } from "@/components/ui/button";

export function LessonComplete({
  lessonId,
  completed,
  nextHref,
}: {
  lessonId: string;
  completed: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [isDone, setIsDone] = React.useState(completed);
  const [pending, start] = React.useTransition();

  function toggle() {
    const next = !isDone;
    setIsDone(next);
    start(async () => {
      await setLessonComplete(lessonId, next);
      router.refresh();
    });
  }

  function complete() {
    start(async () => {
      if (!isDone) {
        setIsDone(true);
        await setLessonComplete(lessonId, true);
      }
      if (nextHref) router.push(nextHref);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={isDone ? "secondary" : "outline"} onClick={toggle} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <Circle className="size-4" />
        )}
        {isDone ? "Пройдено" : "Отметить пройденным"}
      </Button>

      {nextHref && (
        <Button onClick={complete} disabled={pending}>
          Следующий урок <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
