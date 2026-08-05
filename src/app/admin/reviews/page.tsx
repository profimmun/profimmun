import { prisma } from "@/lib/prisma";
import { ReviewBrowser, type ReviewItem } from "@/components/admin/review-browser";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewsCoursesPage() {
  // Показываем все курсы, у которых есть хотя бы один тест — даже если работ
  // ещё нет. Так администратор видит анкету/тест сразу после создания, а не
  // ждёт первой отправки. Счётчики работ накладываем сверху.
  const [courses, attempts] = await Promise.all([
    prisma.course.findMany({
      where: { modules: { some: { lessons: { some: { tests: { some: {} } } } } } },
      select: {
        id: true,
        title: true,
        modules: {
          select: { lessons: { select: { id: true, tests: { select: { id: true } } } } },
        },
      },
    }),
    prisma.testAttempt.findMany({
      where: { status: { in: ["SUBMITTED", "GRADED"] } },
      select: {
        status: true,
        test: {
          select: {
            lesson: { select: { module: { select: { courseId: true } } } },
          },
        },
      },
    }),
  ]);

  // Работы по курсам
  const stats = new Map<string, { pending: number; total: number }>();
  for (const a of attempts) {
    const courseId = a.test.lesson?.module.courseId;
    if (!courseId) continue;
    const s = stats.get(courseId) ?? { pending: 0, total: 0 };
    s.total += 1;
    if (a.status === "SUBMITTED") s.pending += 1;
    stats.set(courseId, s);
  }

  const items: ReviewItem[] = courses
    .map((c) => {
      const lessonsWithTests = c.modules.reduce(
        (n, m) => n + m.lessons.filter((l) => l.tests.length > 0).length,
        0
      );
      const s = stats.get(c.id) ?? { pending: 0, total: 0 };
      return {
        id: c.id,
        href: `/admin/reviews/${c.id}`,
        title: c.title,
        subtitle:
          `${lessonsWithTests} ${plural(lessonsWithTests, ["урок с тестом", "урока с тестами", "уроков с тестами"])}` +
          ` · ${s.total} ${plural(s.total, ["работа", "работы", "работ"])}`,
        pending: s.pending,
        total: s.total,
      };
    })
    .sort(
      (a, b) => b.pending - a.pending || b.total - a.total || a.title.localeCompare(b.title)
    );

  const totalPending = items.reduce((s, i) => s + i.pending, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Проверка ответов</h1>
        <p className="mt-1 text-muted-foreground">
          {totalPending > 0
            ? `${totalPending} ${plural(totalPending, ["работа ждёт", "работы ждут", "работ ждут"])} проверки. Выберите курс.`
            : "Выберите курс, чтобы посмотреть ответы студентов."}
        </p>
      </div>

      <ReviewBrowser
        items={items}
        placeholder="Поиск по курсам"
        emptyTitle="Курсов с тестами пока нет"
        emptyHint="Добавьте тест или анкету к уроку — курс появится здесь для проверки ответов."
      />
    </div>
  );
}
