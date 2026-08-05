import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ссылка «назад» с настоящей иконкой (не текстовой стрелкой).
 * Иконка сдвигается влево при наведении — привычная подсказка направления.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      <span className="truncate">{children}</span>
    </Link>
  );
}
