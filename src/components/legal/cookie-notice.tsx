"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyStoredValueChange, useStoredFlag } from "@/lib/client-state";

const STORAGE_KEY = "cookie-notice-accepted";

/**
 * Уведомление об использовании cookie.
 *
 * Платформа использует только строго необходимые cookie (идентификатор сессии),
 * поэтому это именно информирование, а не сбор согласия с возможностью отказа:
 * без cookie авторизации вход технически невозможен. Если в будущем появится
 * аналитика — её потребуется выносить в отдельное, отключаемое согласие.
 */
export function CookieNotice() {
  const accepted = useStoredFlag(STORAGE_KEY, true);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      notifyStoredValueChange(STORAGE_KEY);
    } catch {}
  }

  const visible = !accepted;
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Уведомление об использовании cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <Cookie className="size-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Мы используем файлы cookie, необходимые для работы авторизации. Аналитические
          и рекламные cookie не применяются. Подробнее — в{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Политике обработки персональных данных
          </Link>
          .
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">
          Понятно
        </Button>
      </div>
    </div>
  );
}
