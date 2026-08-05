import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgress } from "@/lib/courses";
import { accessibleCourseWhere } from "@/lib/access";
import { CourseCard } from "@/components/course-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Курсы" };

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login

  // Админ видит все опубликованные курсы, студент — только доступные его группам.
  const courses = await prisma.course.findMany({
    where:
      user.role === "ADMIN" ? { published: true } : accessibleCourseWhere(user.id),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { modules: true, enrollments: true } } },
  });

  const enrolledIds = new Set(
    (
      await prisma.enrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true },
      })
    ).map((e) => e.courseId)
  );

  const cards = await Promise.all(
    courses.map(async (c) => {
      let progress: number | undefined;
      if (enrolledIds.has(c.id)) {
        progress = (await getCourseProgress(user.id, c.id)).percent;
      }
      return {
        slug: c.slug,
        title: c.title,
        description: c.description,
        coverImage: c.coverImage,
        modules: c._count.modules,
        students: c._count.enrollments,
        progress,
      };
    })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Каталог курсов</h1>
        <p className="mt-2 text-muted-foreground">
          Выберите курс и начните учиться в удобном темпе
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
          <BookOpen className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Доступных курсов пока нет</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Курсы появятся, когда администратор откроет доступ вашей группе.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
