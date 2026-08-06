import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand href="/dashboard" />

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </div>
    </header>
  );
}
