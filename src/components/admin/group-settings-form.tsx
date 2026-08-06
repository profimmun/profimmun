"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { updateGroup, deleteGroup } from "@/lib/group-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GroupSettingsForm({
  group,
}: {
  group: { id: string; name: string; description: string };
}) {
  const router = useRouter();
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateGroup(group.id, fd);
      if (res && "error" in res && res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: "Сохранено" });
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!confirm(`Удалить группу «${group.name}»? Студенты и курсы останутся, пропадёт только группировка.`))
      return;
    start(async () => {
      await deleteGroup(group.id);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Название</Label>
          <Input id="name" name="name" defaultValue={group.name} required />
        </div>
        <div>
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={group.description}
            rows={2}
            className="min-h-0"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onDelete}
          className="justify-center text-destructive hover:bg-destructive/10 sm:justify-start"
        >
          <Trash2 className="size-4" /> Удалить группу
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Сохранить
        </Button>
      </div>
    </form>
  );
}
