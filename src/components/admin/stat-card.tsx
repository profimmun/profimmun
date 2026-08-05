import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Плитка показателя на дашборде. Если передан href — становится ссылкой
 * с явной подсказкой перехода (стрелка) и hover-состоянием.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">{hint ?? ""}</p>
        {href && (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        )}
      </div>
    </>
  );

  const base = "rounded-2xl border border-border bg-card p-5 shadow-sm";

  if (!href) {
    return <div className={cn(base, className)}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group block transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {body}
    </Link>
  );
}
