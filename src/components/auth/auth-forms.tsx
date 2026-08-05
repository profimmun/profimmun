"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  registerAction,
  loginAction,
  forgotAction,
  resetAction,
  type FormState,
} from "@/lib/auth-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

function Alert({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  if (state.success)
    return (
      <div className="flex items-start gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  return null;
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@mail.com" required autoComplete="email" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Пароль</Label>
          <Link href="/forgot-password" className="mb-1.5 text-xs text-primary hover:underline">
            Забыли пароль?
          </Link>
        </div>
        <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
      </div>
      <SubmitButton className="w-full" size="lg">Войти</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="name">Имя</Label>
        <Input id="name" name="name" placeholder="Иван Иванов" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@mail.com" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" name="password" type="password" placeholder="Минимум 6 символов" required autoComplete="new-password" />
      </div>

      <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-3">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-muted-foreground">
            Я даю{" "}
            <Link href="/legal/consent" target="_blank" className="text-primary hover:underline">
              согласие на обработку персональных данных
            </Link>{" "}
            и ознакомлен(а) с{" "}
            <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline">
              Политикой обработки
            </Link>
            <span className="text-destructive"> *</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-muted-foreground">
            Я принимаю{" "}
            <Link href="/legal/terms" target="_blank" className="text-primary hover:underline">
              Пользовательское соглашение
            </Link>
            <span className="text-destructive"> *</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="marketing"
            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-muted-foreground">
            Хочу получать письма о новых курсах и материалах (необязательно, можно
            отписаться в любой момент)
          </span>
        </label>
      </div>

      <SubmitButton className="w-full" size="lg">Создать аккаунт</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@mail.com" required autoComplete="email" />
      </div>
      <SubmitButton className="w-full" size="lg">Отправить ссылку</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password">Новый пароль</Label>
        <Input id="password" name="password" type="password" placeholder="Минимум 6 символов" required autoComplete="new-password" />
      </div>
      <SubmitButton className="w-full" size="lg">Сохранить новый пароль</SubmitButton>
    </form>
  );
}
