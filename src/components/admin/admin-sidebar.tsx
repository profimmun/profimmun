"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Users2,
  ClipboardCheck,
  LifeBuoy,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Курсы", icon: BookOpen },
  { href: "/admin/reviews", label: "Проверка ответов", icon: ClipboardCheck },
  { href: "/admin/students", label: "Студенты", icon: Users },
  { href: "/admin/groups", label: "Группы", icon: Users2 },
  { href: "/admin/support", label: "Поддержка", icon: LifeBuoy },
];

export function AdminSidebar({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Мобильный топбар */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-md lg:hidden">
        <Brand href="/admin" />
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          {actions}
          <button
            onClick={() => setOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={open}
            className="grid size-10 place-items-center rounded-md hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <Brand href="/admin" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
            className="rounded-md p-1 hover:bg-muted lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Кабинет студента
          </Link>
        </div>
      </aside>
    </>
  );
}
