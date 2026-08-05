"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, Inbox, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  pending: number;
  total: number;
};

export function ReviewBrowser({
  items,
  placeholder,
  emptyTitle,
  emptyHint,
}: {
  items: ReviewItem[];
  placeholder: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  const [query, setQuery] = React.useState("");
  const [onlyPending, setOnlyPending] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (onlyPending ? i.pending > 0 : true))
      .filter((i) => !q || i.title.toLowerCase().includes(q));
  }, [items, query, onlyPending]);

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
        <Inbox className="mb-3 size-10 text-muted-foreground" />
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={() => setOnlyPending((v) => !v)}
          aria-pressed={onlyPending}
          className={cn(
            "h-11 shrink-0 rounded-xl border px-4 text-sm font-medium transition-colors",
            onlyPending
              ? "border-primary bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Только непроверенные
        </button>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Показано {filtered.length} из {items.length}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="font-medium">Ничего не найдено</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Измените запрос или снимите фильтр.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>

                {item.pending > 0 ? (
                  <Badge variant="warning" className="shrink-0">
                    {item.pending} ждут проверки
                  </Badge>
                ) : (
                  <span className="hidden shrink-0 items-center gap-1.5 text-sm text-success sm:inline-flex">
                    <CheckCircle2 className="size-4" /> всё проверено
                  </span>
                )}

                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
