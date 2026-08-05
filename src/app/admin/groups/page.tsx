import Link from "next/link";
import { Users2, BookOpen, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GroupCreateForm } from "@/components/admin/group-create-form";
import { Badge } from "@/components/ui/badge";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, openCourses] = await Promise.all([
    prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true, courses: true } } },
    }),
    prisma.course.count({ where: { published: true, restricted: false } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Группы</h1>
          <p className="mt-1 text-muted-foreground">
            Объединяйте студентов и выдавайте доступ к курсам
          </p>
        </div>
        <GroupCreateForm />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Как работает доступ.</strong> По
        умолчанию все опубликованные курсы открыты каждому студенту сразу после
        регистрации — добавлять людей вручную не нужно. Группы нужны, когда курс
        хотят закрыть: включите у курса «Доступ только для групп», и его увидят лишь
        участники назначенных групп. Сейчас открыты всем:{" "}
        <strong className="text-foreground">{openCourses}</strong>{" "}
        {plural(openCourses, ["курс", "курса", "курсов"])}.
      </div>

      {groups.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Users2 className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Групп пока нет</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Создайте первую группу, чтобы разделить студентов по потокам, тарифам или
            направлениям.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/groups/${g.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Users2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {g.description || "Без описания"}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <Badge variant="muted">
                    <Users2 className="size-3.5" /> {g._count.members}
                  </Badge>
                  <Badge variant={g._count.courses > 0 ? "default" : "muted"}>
                    <BookOpen className="size-3.5" /> {g._count.courses}
                  </Badge>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
