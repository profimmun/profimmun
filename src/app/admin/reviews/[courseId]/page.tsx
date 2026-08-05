import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewBrowser, type ReviewItem } from "@/components/admin/review-browser";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewsLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // Все уроки курса, у которых есть тест (даже без единой работы).
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, tests: { select: { id: true } } },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const attempts = await prisma.testAttempt.findMany({
    where: {
      status: { in: ["SUBMITTED", "GRADED"] },
      test: { lesson: { module: { courseId } } },
    },
    select: {
      status: true,
      test: { select: { lesson: { select: { id: true } } } },
    },
  });

  // Счётчики работ по урокам
  const stats = new Map<string, { pending: number; total: number }>();
  for (const a of attempts) {
    const lessonId = a.test.lesson?.id;
    if (!lessonId) continue;
    const s = stats.get(lessonId) ?? { pending: 0, total: 0 };
    s.total += 1;
    if (a.status === "SUBMITTED") s.pending += 1;
    stats.set(lessonId, s);
  }

  const items: ReviewItem[] = course.modules
    .flatMap((m) =>
      m.lessons
        .filter((l) => l.tests.length > 0)
        .map((l) => {
          const s = stats.get(l.id) ?? { pending: 0, total: 0 };
          return {
            id: l.id,
            href: `/admin/reviews/${courseId}/${l.id}`,
            title: l.title,
            subtitle: `${m.title} · ${s.total} ${plural(s.total, ["работа", "работы", "работ"])}`,
            pending: s.pending,
            total: s.total,
          };
        })
    )
    .sort((a, b) => b.pending - a.pending || b.total - a.total);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Проверка ответов", href: "/admin/reviews" },
          { label: course.title },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
        <p className="mt-1 text-muted-foreground">Выберите урок, чтобы посмотреть ответы</p>
      </div>

      <ReviewBrowser
        items={items}
        placeholder="Поиск по урокам"
        emptyTitle="В этом курсе нет уроков с тестами"
        emptyHint="Добавьте тест или анкету к уроку курса."
      />
    </div>
  );
}
