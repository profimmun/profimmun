import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Уже вошедших уводим из auth-страниц
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--accent),transparent)] opacity-70" />
      <header className="flex items-center justify-between p-5">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in-up">{children}</div>
      </main>

      <footer className="p-5 text-center text-sm text-muted-foreground">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/legal/privacy" className="hover:text-foreground">
            Политика обработки данных
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Пользовательское соглашение
          </Link>
          <Link href="/support" className="hover:text-foreground">
            Поддержка
          </Link>
        </nav>
      </footer>
    </div>
  );
}
