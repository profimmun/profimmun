"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Loader2, Hourglass, Trophy } from "lucide-react";
import { submitTest, type AnswerPayload, type TestResult } from "@/lib/test-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, plural } from "@/lib/utils";

type Option = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE" | "OPEN";
  points: number;
  required: boolean;
  options: Option[];
};
type Test = { id: string; title: string; description: string; questions: Question[] };

export function TestRunner({ test }: { test: Test }) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
  const [open, setOpen] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<TestResult | null>(null);
  const [pending, start] = React.useTransition();

  function toggleOption(q: Question, optId: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.type === "SINGLE") return { ...prev, [q.id]: [optId] };
      return {
        ...prev,
        [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId],
      };
    });
  }

  const [showErrors, setShowErrors] = React.useState(false);

  function isAnswered(q: Question) {
    return q.type === "OPEN"
      ? (open[q.id]?.trim().length ?? 0) > 0
      : (answers[q.id]?.length ?? 0) > 0;
  }

  function submit() {
    // Не отправляем, пока не заполнены обязательные вопросы.
    // Необязательные можно пропустить.
    const unanswered = test.questions.filter((q) => q.required && !isAnswered(q));
    if (unanswered.length > 0) {
      setShowErrors(true);
      const first = document.getElementById(`q-${unanswered[0].id}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const payload: AnswerPayload[] = test.questions.map((q) => ({
      questionId: q.id,
      selectedIds: answers[q.id] ?? [],
      openAnswer: open[q.id] ?? "",
    }));
    start(async () => {
      const r = await submitTest(test.id, payload);
      setResult(r);
      router.refresh();
    });
  }

  if (result) {
    const pct = result.autoMax > 0 ? Math.round((result.score / result.autoMax) * 100) : 0;
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <Trophy className="size-7" />
        </div>
        <h3 className="text-lg font-semibold">Тест отправлен!</h3>
        <p className="mt-1 text-muted-foreground">
          Автоматически проверено: <span className="font-medium text-foreground">{result.score}</span> из {result.autoMax} баллов ({pct}%)
        </p>
        {result.needsReview && (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-warning">
            <Hourglass className="size-4" />
            Открытые вопросы ожидают проверки преподавателем
          </p>
        )}
      </div>
    );
  }

  const requiredQuestions = test.questions.filter((q) => q.required);
  const requiredAnswered = requiredQuestions.filter(isAnswered).length;
  const selectedOptionsCount = Object.values(answers).reduce((sum, selected) => sum + selected.length, 0);
  const answeredOpenCount = Object.values(open).filter((value) => value.trim().length > 0).length;
  const selectedAnswersCount = selectedOptionsCount + answeredOpenCount;

  function selectedLabel(count: number) {
    return `${count} ${plural(count, ["ответ", "ответа", "ответов"])}`;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">{test.title}</h3>
      </div>
      {test.description && <p className="mb-5 text-sm text-muted-foreground">{test.description}</p>}

      <ol className="space-y-6">
        {test.questions.map((q, i) => {
          const missing = showErrors && q.required && !isAnswered(q);
          return (
          <li key={q.id} id={`q-${q.id}`} className="scroll-mt-24">
            <div className="mb-3 flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {q.text} {q.required && <span className="text-destructive">*</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(q.type === "MULTIPLE"
                    ? "Выберите несколько вариантов"
                    : q.type === "SINGLE"
                    ? "Выберите один вариант"
                    : "Открытый ответ") + (q.required ? "" : " · необязательно")}
                </p>
              </div>
            </div>

            {q.type === "OPEN" ? (
              <Textarea
                value={open[q.id] ?? ""}
                onChange={(e) => setOpen((p) => ({ ...p, [q.id]: e.target.value }))}
                placeholder="Введите ваш ответ..."
                className={cn("ml-8 w-[calc(100%-2rem)]", missing && "border-destructive")}
              />
            ) : (
              <div className={cn("ml-8 space-y-2 rounded-md", missing && "ring-1 ring-destructive")}>
                {q.options.map((o) => {
                  const checked = (answers[q.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOption(q, o.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        checked
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center border",
                          q.type === "MULTIPLE" ? "rounded" : "rounded-full",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
                        )}
                      >
                        {checked && <CheckCircle2 className="size-3.5" />}
                      </span>
                      {o.text}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <span className="text-sm text-muted-foreground">
          {showErrors && requiredAnswered < requiredQuestions.length ? (
            <span className="text-destructive">Заполните обязательные вопросы (со звёздочкой)</span>
          ) : (
            <>Выбрано {selectedLabel(selectedAnswersCount)}</>
          )}
        </span>
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Отправить
        </Button>
      </div>
    </div>
  );
}
