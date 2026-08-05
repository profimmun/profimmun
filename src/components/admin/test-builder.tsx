"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  ClipboardCheck,
} from "lucide-react";
import { saveTest, deleteTest } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type QType = "SINGLE" | "MULTIPLE" | "OPEN";
type Option = { id: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  text: string;
  type: QType;
  points: number;
  required: boolean;
  options: Option[];
};

type Props = {
  lessonId: string;
  courseId: string;
  initial: {
    title: string;
    description: string;
    questions: Question[];
  } | null;
};

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyQuestion(): Question {
  return {
    id: uid(),
    text: "",
    type: "SINGLE",
    points: 1,
    required: true,
    options: [
      { id: uid(), text: "", isCorrect: true },
      { id: uid(), text: "", isCorrect: false },
    ],
  };
}

export function TestBuilder({ lessonId, courseId, initial }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(Boolean(initial));
  const [title, setTitle] = React.useState(initial?.title ?? "Тест по уроку");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [questions, setQuestions] = React.useState<Question[]>(
    initial?.questions?.length ? initial.questions : [emptyQuestion()]
  );
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = React.useTransition();

  function patchQuestion(qid: string, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  }

  function changeType(qid: string, type: QType) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== qid) return q;
        if (type === "OPEN") return { ...q, type, options: [] };
        let options = q.options.length ? q.options : emptyQuestion().options;
        if (type === "SINGLE") {
          // оставляем правильным только первый отмеченный
          let found = false;
          options = options.map((o) => {
            if (o.isCorrect && !found) {
              found = true;
              return o;
            }
            return { ...o, isCorrect: false };
          });
        }
        return { ...q, type, options };
      })
    );
  }

  function toggleCorrect(qid: string, oid: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== qid) return q;
        if (q.type === "SINGLE") {
          return { ...q, options: q.options.map((o) => ({ ...o, isCorrect: o.id === oid })) };
        }
        return {
          ...q,
          options: q.options.map((o) => (o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o)),
        };
      })
    );
  }

  function addOption(qid: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, { id: uid(), text: "", isCorrect: false }] } : q
      )
    );
  }
  function removeOption(qid: string, oid: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, options: q.options.filter((o) => o.id !== oid) } : q))
    );
  }
  function updateOption(qid: string, oid: string, text: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, text } : o)) }
          : q
      )
    );
  }

  function validate(): string | null {
    for (const q of questions) {
      if (!q.text.trim()) return "У всех вопросов должен быть текст";
      if (q.type !== "OPEN") {
        const filled = q.options.filter((o) => o.text.trim());
        if (filled.length < 2) return "В закрытом вопросе нужно минимум 2 варианта";
        if (!filled.some((o) => o.isCorrect)) return "Отметьте хотя бы один правильный вариант";
      }
    }
    return null;
  }

  function save() {
    const err = validate();
    if (err) {
      setMsg({ type: "err", text: err });
      return;
    }
    start(async () => {
      const res = await saveTest(lessonId, courseId, { title, description, questions });
      if (res && "error" in res && (res as { error?: string }).error) {
        setMsg({ type: "err", text: (res as { error: string }).error });
      } else {
        setMsg({ type: "ok", text: "Тест сохранён" });
        router.refresh();
      }
    });
  }

  function removeTest() {
    if (!confirm("Удалить тест урока?")) return;
    start(async () => {
      await deleteTest(lessonId, courseId);
      setEnabled(false);
      setQuestions([emptyQuestion()]);
      setTitle("Тест по уроку");
      setDescription("");
      router.refresh();
    });
  }

  if (!enabled) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-border py-10 text-center">
        <ClipboardCheck className="mb-2 size-8 text-muted-foreground" />
        <p className="font-medium">К уроку не добавлен тест</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Добавьте вопросы с открытыми и закрытыми вариантами ответов.
        </p>
        <Button onClick={() => setEnabled(true)}>
          <Plus className="size-4" /> Создать тест
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Название теста</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Описание (необязательно)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-2">
              <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
              <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
                {qi + 1}
              </span>
              <div className="flex-1">
                <Textarea
                  value={q.text}
                  onChange={(e) => patchQuestion(q.id, { text: e.target.value })}
                  placeholder="Текст вопроса"
                  rows={2}
                  className="min-h-0"
                />
              </div>
              <button
                onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                className="mt-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Удалить вопрос"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3 pl-8">
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["SINGLE", "MULTIPLE", "OPEN"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeType(q.id, t)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      q.type === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {t === "SINGLE" ? "Один ответ" : t === "MULTIPLE" ? "Несколько" : "Открытый"}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Баллы:
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={q.points}
                  onChange={(e) => patchQuestion(q.id, { points: Number(e.target.value) })}
                  className="h-8 w-16"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => patchQuestion(q.id, { required: e.target.checked })}
                  className="size-4 accent-[var(--primary)]"
                />
                Обязательный
              </label>
            </div>

            {q.type === "OPEN" ? (
              <p className="pl-8 text-xs text-muted-foreground">
                Студент вводит свободный ответ. Проверяется вручную в разделе «Проверка ответов».
              </p>
            ) : (
              <div className="space-y-2 pl-8">
                {q.options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(q.id, o.id)}
                      title={o.isCorrect ? "Правильный ответ" : "Отметить правильным"}
                      className={cn(
                        "grid size-6 shrink-0 place-items-center border transition-colors",
                        q.type === "MULTIPLE" ? "rounded" : "rounded-full",
                        o.isCorrect
                          ? "border-success bg-success text-white"
                          : "border-input hover:border-success"
                      )}
                    >
                      {o.isCorrect && <CheckCircle2 className="size-4" />}
                    </button>
                    <Input
                      value={o.text}
                      onChange={(e) => updateOption(q.id, o.id, e.target.value)}
                      placeholder="Вариант ответа"
                      className="h-9"
                    />
                    <button
                      onClick={() => removeOption(q.id, o.id)}
                      disabled={q.options.length <= 2}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(q.id)}
                  className="ml-8 text-sm text-primary hover:underline"
                >
                  + вариант
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
        <Plus className="size-4" /> Добавить вопрос
      </Button>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <Button variant="ghost" onClick={removeTest} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" /> Удалить тест
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Сохранить тест
        </Button>
      </div>
    </div>
  );
}
