import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, GraduationCap, CheckCircle2, Compass } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getEnrolledCourses } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { CourseCard } from "@/components/course-card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мой кабинет" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [enrolled, completedLessons, gradedAttempts] = await Promise.all([
    getEnrolledCourses(user.id, user.role),
    prisma.lessonProgress.count({ where: { userId: user.id, completed: true } }),
    prisma.testAttempt.count({ where: { userId: user.id, status: "GRADED" } }),
  ]);

  const stats = [
    { icon: BookOpen, label: "Курсов в обучении", value: enrolled.length },
    { icon: CheckCircle2, label: "Уроков пройдено", value: completedLessons },
    { icon: GraduationCap, label: "Тестов проверено", value: gradedAttempts },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Привет, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-2 text-muted-foreground">Продолжайте с того места, где остановились.</p>

      {/* Статистика */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid size-12 place-items-center rounded-lg bg-accent text-accent-foreground">
              <s.icon className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Мои курсы */}
      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Мои курсы</h2>
        <Link href="/courses" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Compass className="size-4" /> Каталог
        </Link>
      </div>

      {enrolled.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-lg border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Вы ещё не записались ни на один курс</p>
          <p className="mb-4 text-sm text-muted-foreground">Выберите курс в каталоге и начните учиться.</p>
          <Link href="/courses" className={buttonVariants({})}>
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrolled.map(({ course, progress }) => (
            <CourseCard
              key={course.id}
              course={{
                slug: course.slug,
                title: course.title,
                description: course.description,
                coverImage: course.coverImage,
                modules: course._count.modules,
                students: course._count.enrollments,
                progress: progress.percent,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
