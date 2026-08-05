import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <LogoMark className="mx-auto mb-8 size-14" />
        <p className="text-7xl font-bold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-muted-foreground">
          Возможно, она была перемещена или удалена.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          На главную
        </Link>
      </div>
    </div>
  );
}
