import Link from "next/link";
import { BookOpen, FileText, Users, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CourseCreateForm } from "@/components/admin/course-create-form";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrollments: true, modules: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Курсы</h1>
          <p className="mt-1 text-muted-foreground">Создавайте и редактируйте курсы школы</p>
        </div>
        <CourseCreateForm />
      </div>

      {courses.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
          <BookOpen className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Пока нет курсов</p>
          <p className="text-sm text-muted-foreground">Нажмите «Новый курс», чтобы начать.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">Курс</th>
                <th className="hidden p-4 font-medium sm:table-cell">Содержание</th>
                <th className="hidden p-4 font-medium md:table-cell">Студенты</th>
                <th className="p-4 font-medium">Публикация</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => {
                const lessons = c.modules.reduce((s, m) => s + m._count.lessons, 0);
                return (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="p-4">
                      <Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-primary">
                        {c.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">Создан {formatDate(c.createdAt)}</p>
                    </td>
                    <td className="hidden p-4 text-muted-foreground sm:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3.5" /> {c._count.modules}
                      </span>
                      <span className="ml-3 inline-flex items-center gap-1">
                        <FileText className="size-3.5" /> {lessons}
                      </span>
                    </td>
                    <td className="hidden p-4 text-muted-foreground md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" /> {c._count.enrollments}
                      </span>
                    </td>
                    <td className="p-4">
                      <PublishToggle courseId={c.id} published={c.published} />
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/courses/${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        <Pencil className="size-4" /> Редактировать
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
