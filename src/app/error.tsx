"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Граница ошибок приложения. Без неё серверный сбой показывается
 * стандартной страницей хостинга без всякого контекста.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Ошибка приложения:", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>

        <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-2 text-muted-foreground">
          Не удалось выполнить операцию. Попробуйте ещё раз — если ошибка
          повторяется, напишите нам, и мы разберёмся.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">
            Код ошибки: <code>{error.digest}</code> — укажите его в обращении.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="size-4" /> Повторить
          </Button>
          <Link href="/support" className={buttonVariants({ variant: "secondary" })}>
            Написать в поддержку
          </Link>
        </div>
      </div>
    </div>
  );
}
