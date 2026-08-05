"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table2,
  LayoutGrid,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Award,
  MessageSquareText,
  ListChecks,
} from "lucide-react";
import { gradeAnswers } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { notifyStoredValueChange, useStoredChoice } from "@/lib/client-state";
import { cn, formatDateTime } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";

export type ReviewAnswer = {
  answerId: string;
  studentName: string;
  studentEmail: string;
  /** Текст открытого ответа или выбранные варианты для закрытого */
  text: string;
  awarded: number;
  graded: boolean;
  isCorrect: boolean | null;
  submittedAt: string | null;
};

export type ReviewQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  answers: ReviewAnswer[];
};

type View = "cards" | "table";

function isView(value: string | null): value is View {
  return value === "cards" || value === "table";
}

export function AnswersReview({ questions }: { questions: ReviewQuestion[] }) {
  const router = useRouter();
  const view = useStoredChoice("reviews:view", "cards", isView);
  const [onlyPending, setOnlyPending] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(
      questions.flatMap((q) =>
        q.answers.map((a) => [a.answerId, a.graded ? a.awarded : q.points])
      )
    )
  );
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [isPending, start] = React.useTransition();

  // Запоминаем выбранный режим просмотра
  function changeView(v: View) {
    localStorage.setItem("reviews:view", v);
    notifyStoredValueChange("reviews:view");
  }

  const openQuestions = questions.filter((q) => q.type === "OPEN");
  const totalPending = openQuestions.reduce(
    (s, q) => s + q.answers.filter((a) => !a.graded).length,
    0
  );

  function save(question: ReviewQuestion) {
    const entries = question.answers
      .filter((a) => !onlyPending || !a.graded)
      .map((a) => ({
        answerId: a.answerId,
        points: draft[a.answerId] ?? 0,
        maxPoints: question.points,
      }));
    setPendingId(question.id);
    start(async () => {
      const res = await gradeAnswers(entries);
      setMsg(
        res && "success" in res
          ? { type: "ok", text: res.success }
          : { type: "err", text: "Не удалось сохранить" }
      );
      setPendingId(null);
      router.refresh();
    });
  }

  function setAll(question: ReviewQuestion, value: number) {
    setDraft((d) => {
      const next = { ...d };
      for (const a of question.answers) next[a.answerId] = value;
      return next;
    });
  }

  if (questions.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
        <MessageSquareText className="mb-3 size-10 text-muted-foreground" />
        <p className="font-medium">К этому уроку ещё нет ответов</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ответы появятся после того, как студенты пройдут тест.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Панель управления */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          {totalPending > 0 ? (
            <Badge variant="warning">{totalPending} ждут оценки</Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-success">
              <CheckCircle2 className="size-4" /> Всё проверено
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOnlyPending((v) => !v)}
            aria-pressed={onlyPending}
            className={cn(
              "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
              onlyPending
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Только неоценённые
          </button>

          <div
            role="group"
            aria-label="Режим просмотра"
            className="flex overflow-hidden rounded-lg border border-border"
          >
            <button
              onClick={() => changeView("cards")}
              aria-pressed={view === "cards"}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                view === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <LayoutGrid className="size-4" /> Карточки
            </button>
            <button
              onClick={() => changeView("table")}
              aria-pressed={view === "table"}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Table2 className="size-4" /> Таблица
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-xl p-3 text-sm",
            msg.type === "ok" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}
        >
          {msg.type === "ok" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {msg.text}
        </div>
      )}

      {/* Вопросы */}
      {questions.map((q, qi) => {
        const answers = q.answers.filter((a) => (onlyPending ? !a.graded : true));
        const isOpen = q.type === "OPEN";
        const busy = isPending && pendingId === q.id;

        return (
          <section key={q.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <header className="border-b border-border p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
                  {qi + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{q.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {isOpen ? <MessageSquareText className="size-3.5" /> : <ListChecks className="size-3.5" />}
                      {isOpen ? "Открытый ответ" : "Закрытый вопрос"}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Award className="size-3.5" /> макс. {q.points}
                    </span>
                    <span>·</span>
                    <span>{q.answers.length} отв.</span>
                  </div>
                </div>
              </div>
            </header>

            {answers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {onlyPending ? "Все ответы на этот вопрос оценены." : "Ответов нет."}
              </p>
            ) : view === "table" ? (
              <TableView
                question={q}
                answers={answers}
                draft={draft}
                setDraft={setDraft}
                editable={isOpen}
              />
            ) : (
              <CardsView
                question={q}
                answers={answers}
                draft={draft}
                setDraft={setDraft}
                editable={isOpen}
              />
            )}

            {isOpen && answers.length > 0 && (
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAll(q, q.points)}>
                    Всем полный балл
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAll(q, 0)}>
                    Всем 0
                  </Button>
                </div>
                <Button size="sm" onClick={() => save(q)} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Сохранить оценки
                </Button>
              </footer>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────────── Табличный режим ─────────────────── */

function TableView({
  question,
  answers,
  draft,
  setDraft,
  editable,
}: {
  question: ReviewQuestion;
  answers: ReviewAnswer[];
  draft: Record<string, number>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editable: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="p-3 font-medium">Студент</th>
            <th className="p-3 font-medium">Ответ</th>
            <th className="w-32 p-3 font-medium">Баллы</th>
            <th className="w-28 p-3 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {answers.map((a) => (
            <tr key={a.answerId} className="align-top hover:bg-muted/40">
              <td className="p-3">
                <p className="font-medium">{a.studentName}</p>
                <p className="truncate text-xs text-muted-foreground">{a.studentEmail}</p>
              </td>
              <td className="max-w-md p-3">
                <p className="line-clamp-2 whitespace-pre-line text-muted-foreground" title={a.text}>
                  {a.text || "— ответ не введён —"}
                </p>
              </td>
              <td className="p-3">
                {editable ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={question.points}
                      aria-label={`Баллы для ${a.studentName}`}
                      value={draft[a.answerId] ?? 0}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [a.answerId]: clamp(Number(e.target.value), question.points),
                        }))
                      }
                      className="h-9 w-20"
                    />
                    <span className="text-xs text-muted-foreground">/ {question.points}</span>
                  </div>
                ) : (
                  <span className="font-medium">
                    {a.awarded} / {question.points}
                  </span>
                )}
              </td>
              <td className="p-3">
                <StatusBadge answer={a} editable={editable} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────── Режим карточек ─────────────────── */

function CardsView({
  question,
  answers,
  draft,
  setDraft,
  editable,
}: {
  question: ReviewQuestion;
  answers: ReviewAnswer[];
  draft: Record<string, number>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editable: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {answers.map((a) => (
        <li key={a.answerId} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{a.studentName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {a.studentEmail}
                {a.submittedAt && ` · ${formatDateTime(a.submittedAt)}`}
              </p>
            </div>
            <StatusBadge answer={a} editable={editable} />
          </div>

          <p className="mt-3 whitespace-pre-line rounded-xl bg-muted p-3 text-sm">
            {a.text || <em className="text-muted-foreground">— ответ не введён —</em>}
          </p>

          {editable ? (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor={`pts-${a.answerId}`}>
                Баллы:
              </label>
              <Input
                id={`pts-${a.answerId}`}
                type="number"
                min={0}
                max={question.points}
                value={draft[a.answerId] ?? 0}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [a.answerId]: clamp(Number(e.target.value), question.points),
                  }))
                }
                className="h-9 w-24"
              />
              <span className="text-sm text-muted-foreground">из {question.points}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Начислено{" "}
              <span className="font-semibold text-foreground">
                {a.awarded} из {question.points}
              </span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ answer, editable }: { answer: ReviewAnswer; editable: boolean }) {
  if (!editable) {
    return answer.isCorrect ? (
      <Badge variant="success">верно</Badge>
    ) : (
      <Badge variant="destructive">неверно</Badge>
    );
  }
  return answer.graded ? (
    <Badge variant="success">оценено</Badge>
  ) : (
    <Badge variant="warning">ждёт оценки</Badge>
  );
}

function clamp(n: number, max: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, n));
}
