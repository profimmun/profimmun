import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackLink } from "@/components/ui/back-link";
import { hasPlaceholders } from "@/lib/legal";

/**
 * Обёртка для правовых страниц. Доступна без авторизации: по ст. 18.1 152-ФЗ
 * политика обработки персональных данных должна публиковаться в открытом доступе.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Brand href="/" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <BackLink href="/">На главную</BackLink>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Редакция от {updatedAt}
        </p>

        {hasPlaceholders() && (
          <div className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium text-foreground">
                Документ содержит незаполненные реквизиты.
              </p>
              <p className="mt-1 text-muted-foreground">
                Укажите данные оператора в <code>src/lib/legal.ts</code> и передайте
                тексты на проверку юристу. До этого документы не имеют юридической
                силы, а публикация платформы преждевременна.
              </p>
            </div>
          </div>
        )}

        <div className="prose-lesson mt-8 text-[15px]">{children}</div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Политика обработки персональных данных
          </Link>
          <Link href="/legal/terms" className="text-primary hover:underline">
            Пользовательское соглашение
          </Link>
          <Link href="/legal/consent" className="text-primary hover:underline">
            Согласие на обработку данных
          </Link>
          <Link href="/support" className="text-primary hover:underline">
            Поддержка
          </Link>
        </div>
      </main>
    </div>
  );
}
