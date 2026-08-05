import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SafeUser } from "./auth";

/**
 * Правило доступа к курсу для студента.
 *
 * По умолчанию курс открыт всем: сразу после регистрации студент видит все
 * опубликованные курсы и может учиться, не дожидаясь действий администратора.
 *
 * Ограничение включается осознанно — галочкой «Доступ только для групп»
 * (Course.restricted). Тогда курс видят лишь участники назначенных ему групп.
 */
export function accessibleCourseWhere(userId: string): Prisma.CourseWhereInput {
  return {
    published: true,
    OR: [
      { restricted: false },
      { groups: { some: { members: { some: { id: userId } } } } },
    ],
  };
}

/** Проверяет, может ли пользователь открыть курс. Админам доступно всё. */
export async function canAccessCourse(
  user: SafeUser,
  courseId: string
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const found = await prisma.course.findFirst({
    where: { id: courseId, ...accessibleCourseWhere(user.id) },
    select: { id: true },
  });
  return found !== null;
}

/** То же, но по slug — удобно для страниц курса и обучения. */
export async function canAccessCourseBySlug(
  user: SafeUser,
  slug: string
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const found = await prisma.course.findFirst({
    where: { slug, ...accessibleCourseWhere(user.id) },
    select: { id: true },
  });
  return found !== null;
}

/**
 * Записывает студента на все доступные ему курсы, которых ещё нет в его списке.
 *
 * Вызывается при регистрации и при каждом входе, поэтому новый курс появляется
 * в кабинете сам — администратору не нужно никого «добавлять». Идемпотентна.
 *
 * (createMany со skipDuplicates в SQLite не поддерживается, поэтому недостающие
 * записи вычисляются заранее.)
 */
export async function syncEnrollments(userId: string): Promise<number> {
  const [accessible, existing] = await Promise.all([
    prisma.course.findMany({
      where: accessibleCourseWhere(userId),
      select: { id: true },
    }),
    prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    }),
  ]);

  const already = new Set(existing.map((e) => e.courseId));
  const missing = accessible.filter((c) => !already.has(c.id));
  if (missing.length === 0) return 0;

  await prisma.enrollment.createMany({
    data: missing.map((c) => ({ userId, courseId: c.id })),
  });
  return missing.length;
}
