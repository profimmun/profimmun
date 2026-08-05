import Link from "next/link";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Платформа — на главную"
      className={cn(
        "inline-flex items-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <Logo className="h-7 w-auto" />
    </Link>
  );
}
