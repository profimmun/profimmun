import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { legal, field, NOT_SET } from "@/lib/legal";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackLink } from "@/components/ui/back-link";
import { SupportForm } from "@/components/support/support-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Задайте вопрос — мы ответим на указанный email.",
};

export default async function SupportPage() {
  // Страница открыта и для неавторизованных: человек может не суметь войти
  // именно из-за проблемы, с которой обращается.
  const user = await getCurrentUser();

  const contacts = [
    { icon: Mail, label: "Почта", value: legal.supportEmail },
    { icon: Phone, label: "Телефон", value: legal.phone },
    { icon: MapPin, label: "Адрес", value: legal.address },
  ].filter((c) => c.value !== NOT_SET);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Brand href={user ? "/dashboard" : "/"} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <BackLink href={user ? "/dashboard" : "/login"}>
          {user ? "В кабинет" : "Ко входу"}
        </BackLink>

        <div className="mt-4 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Поддержка</h1>
            <p className="mt-1 text-muted-foreground">
              Опишите вопрос — ответим на указанный email.
            </p>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {contacts.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <c.icon className="size-3.5" /> {c.label}
                </p>
                <p className="mt-1 break-words text-sm font-medium">{field(c.value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SupportForm defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Забыли пароль? Воспользуйтесь{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            восстановлением доступа
          </Link>{" "}
          — это быстрее, чем ждать ответа поддержки.
        </p>
      </main>
    </div>
  );
}
