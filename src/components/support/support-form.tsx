"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { submitSupportTicket } from "@/lib/support-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

export function SupportForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action] = useActionState(submitSupportTicket, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
        <p className="font-medium">{state.success}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Вернуться на главную
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Как к вам обращаться</Label>
          <Input id="name" name="name" defaultValue={defaultName} required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email для ответа</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            placeholder="you@mail.com"
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Тема</Label>
        <Input id="subject" name="subject" placeholder="Например: не приходит письмо для входа" required />
      </div>

      <div>
        <Label htmlFor="message">Вопрос</Label>
        <Textarea
          id="message"
          name="message"
          rows={7}
          placeholder="Опишите, что произошло и на каком шаге. Чем подробнее, тем быстрее поможем."
          required
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-muted-foreground">
          Я согласен(на) на обработку указанных данных для ответа на обращение —{" "}
          <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline">
            Политика обработки персональных данных
          </Link>
          <span className="text-destructive"> *</span>
        </span>
      </label>

      <SubmitButton className="w-full" size="lg">
        Отправить обращение
      </SubmitButton>
    </form>
  );
}
