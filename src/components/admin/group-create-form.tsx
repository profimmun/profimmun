"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { createGroup } from "@/lib/group-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

export function GroupCreateForm() {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(createGroup, null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Новая группа
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
      <div className="max-h-[calc(100vh-1rem)] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl animate-fade-in-up sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Создать группу</h2>
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
            <Label htmlFor="name">Название группы</Label>
            <Input id="name" name="name" placeholder="Напр. Поток 1 — сентябрь" required autoFocus />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" name="description" placeholder="Кто входит в группу и зачем" />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <SubmitButton>Создать группу</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
