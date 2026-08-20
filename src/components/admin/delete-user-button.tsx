"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { deleteUserAccount } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DeleteUserButtonProps = {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  disabledReason?: string;
  activityLabel: string;
  authoredCourses: number;
};

export function DeleteUserButton({
  userId,
  name,
  email,
  role,
  disabledReason,
  activityLabel,
  authoredCourses,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [state, setState] = React.useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const canSubmit = confirmEmail.trim().toLowerCase() === email.toLowerCase() && !pending;

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmEmail("");
    setState(null);
  }

  function submit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = (await deleteUserAccount(null, formData)) as {
        error?: string;
        success?: string;
      };

      if (result?.error) {
        setState({ error: result.error });
        return;
      }

      setState({ success: result?.success ?? "Пользователь удалён" });
      setOpen(false);
      setConfirmEmail("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? "Удалить пользователя"}
        className={cn(
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          disabledReason && "hover:bg-transparent hover:text-muted-foreground"
        )}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Удалить</span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-user-${userId}`}
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 id={`delete-user-${userId}`} className="text-lg font-semibold">
                    Удалить пользователя?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Действие нельзя отменить. Аккаунт, сессии, записи на курсы,
                    прогресс и попытки тестов будут удалены.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/45 p-4 text-sm">
              <p className="font-medium">{name}</p>
              <p className="mt-0.5 text-muted-foreground">{email}</p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span>{role === "ADMIN" ? "Администратор" : "Студент"}</span>
                <span>{activityLabel}</span>
                {authoredCourses > 0 && (
                  <span className="sm:col-span-2">
                    {authoredCourses} авторских курсов будет передано текущему админу.
                  </span>
                )}
              </div>
            </div>

            <form action={submit} className="mt-5 space-y-4">
              <input type="hidden" name="userId" value={userId} />
              <div>
                <label htmlFor={`confirm-${userId}`} className="text-sm font-medium">
                  Введите email для подтверждения
                </label>
                <Input
                  id={`confirm-${userId}`}
                  name="confirmEmail"
                  value={confirmEmail}
                  onChange={(event) => setConfirmEmail(event.target.value)}
                  placeholder={email}
                  autoComplete="off"
                  className="mt-2"
                />
              </div>

              {state?.error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {state.error}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                  Отмена
                </Button>
                <Button type="submit" variant="destructive" disabled={!canSubmit}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Удалить пользователя
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
