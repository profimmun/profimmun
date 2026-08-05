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
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-2 border-b border-border bg-background/80 px-6 backdrop-blur-md lg:flex">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
