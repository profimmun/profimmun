import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { RoleSelect } from "@/components/admin/role-select";
import { UserGroupsCell } from "@/components/admin/user-groups-cell";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const [me, users, allGroups] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        groups: { select: { id: true } },
        _count: {
          select: { enrollments: true, progress: true, attempts: true },
        },
      },
    }),
    prisma.group.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Студенты и пользователи</h1>
        <p className="mt-1 text-muted-foreground">
          Всего {users.length} · управляйте ролями и следите за активностью
        </p>
      </div>

      {users.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
          <Users className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Пользователей пока нет</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">Пользователь</th>
                <th className="p-4 font-medium">Группы</th>
                <th className="hidden p-4 font-medium lg:table-cell">Записей</th>
                <th className="hidden p-4 font-medium lg:table-cell">Уроков пройдено</th>
                <th className="hidden p-4 font-medium xl:table-cell">Регистрация</th>
                <th className="w-48 p-4 font-medium">Роль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">
                          {u.name}
                          {me?.id === u.id && (
                            <Badge variant="muted" className="ml-2">это вы</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.role === "ADMIN" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <UserGroupsCell
                        userId={u.id}
                        allGroups={allGroups}
                        groupIds={u.groups.map((g) => g.id)}
                      />
                    )}
                  </td>
                  <td className="hidden p-4 text-muted-foreground lg:table-cell">
                    {u._count.enrollments}
                  </td>
                  <td className="hidden p-4 text-muted-foreground lg:table-cell">
                    {u._count.progress}
                  </td>
                  <td className="hidden p-4 text-muted-foreground xl:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="p-4">
                    <RoleSelect userId={u.id} role={u.role as Role} disabled={me?.id === u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
