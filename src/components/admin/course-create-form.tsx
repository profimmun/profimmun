"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { createCourse } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

export function CourseCreateForm() {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(createCourse, null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Новый курс
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
      <div className="max-h-[calc(100vh-1rem)] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl animate-fade-in-up sm:max-w-lg sm:rounded-lg sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Создать курс</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <form action={action} className="space-y-4">
          {state && "error" in state && state.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          <div>
            <Label htmlFor="title">Название курса</Label>
            <Input id="title" name="title" placeholder="Напр. Основы дизайна" required autoFocus />
          </div>
          <div>
            <Label htmlFor="description">Краткое описание</Label>
            <Textarea id="description" name="description" placeholder="О чём этот курс..." />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <SubmitButton>Создать</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
