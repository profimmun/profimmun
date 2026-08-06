import Link from "next/link";
import {
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { EnrollmentsChart, TopCoursesChart } from "@/components/admin/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [
    students,
    coursesPublished,
    coursesDraft,
    lessons,
    enrollments,
    completedLessons,
    pendingReviews,
    recentEnrollments,
    allEnrollments,
    topCourses,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.course.count({ where: { published: true } }),
    prisma.course.count({ where: { published: false } }),
    prisma.lesson.count(),
    prisma.enrollment.count(),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.testAttempt.count({ where: { status: "SUBMITTED" } }),
    prisma.enrollment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, course: { select: { title: true } } },
    }),
    prisma.enrollment.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.course.findMany({
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
      select: { title: true, _count: { select: { enrollments: true } } },
    }),
  ]);

  // Записи по дням за 30 дней
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    byDay.set(key, 0);
  }
  for (const e of allEnrollments) {
    const d = e.createdAt;
    const key = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const enrollSeries = [...byDay.entries()].map(([date, count]) => ({ date, count }));

  const topSeries = topCourses
    .filter((c) => c._count.enrollments > 0)
    .map((c) => ({
      name: c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title,
      count: c._count.enrollments,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд школы</h1>
        <p className="mt-1 text-muted-foreground">Ключевые показатели вашей платформы</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Студентов"
          value={students}
          hint="Управлять ролями и группами"
          href="/admin/students"
        />
        <StatCard
          icon={BookOpen}
          label="Курсов"
          value={coursesPublished + coursesDraft}
          hint={`${coursesPublished} опубликовано · ${coursesDraft} черновиков`}
          href="/admin/courses"
        />
        <StatCard
          icon={FileText}
          label="Уроков"
          value={lessons}
          hint="Редактировать программу курсов"
          href="/admin/courses"
        />
        <StatCard
          icon={GraduationCap}
          label="Записей на курсы"
          value={enrollments}
          hint={`${completedLessons} уроков пройдено`}
          href="/admin/students"
        />
      </div>

      {pendingReviews > 0 && (
        <Link
          href="/admin/reviews"
          className="group flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 transition-colors hover:bg-warning/15 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <ClipboardCheck className="size-5 text-warning" />
            <span className="text-sm font-medium">
              {pendingReviews} тест(ов) ожидают проверки открытых ответов
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-warning">
            Проверить
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <EnrollmentsChart data={enrollSeries} />
        <TopCoursesChart data={topSeries} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4.5 text-primary" /> Последние записи
          </h3>
          <Link href="/admin/students" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Все студенты
          </Link>
        </div>
        {recentEnrollments.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Записей пока нет.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentEnrollments.map((e, i) => (
              <li key={i} className="flex flex-col gap-2 p-4 px-5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="font-medium">{e.user.name}</span>
                  <span className="text-muted-foreground"> записался на </span>
                  <span className="font-medium">{e.course.title}</span>
                </div>
                <Badge variant="muted">{formatDate(e.createdAt)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
