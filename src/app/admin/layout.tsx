import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="lg:grid lg:grid-cols-[256px_1fr]">
      <AdminSidebar
        actions={
          <>
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} role={user.role} showName />
          </>
        }
      />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-2 border-b border-border bg-background/80 px-6 backdrop-blur-md lg:flex">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} role={user.role} showName />
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
