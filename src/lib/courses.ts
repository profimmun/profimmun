import "server-only";
import { prisma } from "./prisma";

/** Курс с модулями и уроками в правильном порядке. */
export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { tests: { select: { id: true, title: true } } },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
}

/** Прогресс пользователя по курсу: сколько уроков пройдено. */
export async function getCourseProgress(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId }, published: true },
    select: { id: true },
  });
  const total = lessons.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0, completedIds: new Set<string>() };

  const done = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completed: true,
      lessonId: { in: lessons.map((l) => l.id) },
    },
    select: { lessonId: true },
  });
  const completedIds = new Set(done.map((d) => d.lessonId));
  const completed = completedIds.size;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    completedIds,
  };
}

/** Записан ли пользователь на курс. */
export async function isEnrolled(userId: string, courseId: string) {
  const e = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  return Boolean(e);
}

/** Курсы, на которые записан студент, с прогрессом. */
export async function getEnrolledCourses(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        include: { _count: { select: { modules: true, enrollments: true } } },
      },
    },
  });

  return Promise.all(
    enrollments.map(async (e) => {
      const progress = await getCourseProgress(userId, e.courseId);
      return { course: e.course, progress };
    })
  );
}
