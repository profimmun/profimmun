import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GroupManager } from "@/components/admin/group-manager";
import { GroupSettingsForm } from "@/components/admin/group-settings-form";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [group, students, courses] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      include: {
        members: { select: { id: true } },
        courses: { select: { id: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, published: true },
    }),
  ]);

  if (!group) notFound();

  const memberIds = new Set(group.members.map((m) => m.id));
  const courseIds = new Set(group.courses.map((c) => c.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Группы", href: "/admin/groups" }, { label: group.name }]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {group.members.length} участников · доступ к {group.courses.length} курсам
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Настройки группы</h2>
        <GroupSettingsForm
          group={{ id: group.id, name: group.name, description: group.description }}
        />
      </section>

      <GroupManager
        groupId={group.id}
        students={students.map((s) => ({ ...s, member: memberIds.has(s.id) }))}
        courses={courses.map((c) => ({ ...c, allowed: courseIds.has(c.id) }))}
      />
    </div>
  );
}
