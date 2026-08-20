"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireRole } from "./auth";
import { slugify } from "./utils";
import { courseSchema, moduleSchema, lessonSchema } from "./validations";
import { validateVideoSource, type VideoType } from "./video";

async function ensureAdmin() {
  return requireRole("ADMIN");
}

/** Уникальный slug для курса. */
async function uniqueCourseSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = slugify(base);
  let i = 1;
  while (true) {
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${slugify(base)}-${i++}`;
  }
}

/** Уникальный slug урока внутри модуля. */
async function uniqueLessonSlug(moduleId: string, base: string, ignoreId?: string) {
  let slug = slugify(base);
  let i = 1;
  while (true) {
    const existing = await prisma.lesson.findFirst({ where: { moduleId, slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${slugify(base)}-${i++}`;
  }
}

/* ─────────────────────────── Курсы ─────────────────────────── */

export async function createCourse(_prev: unknown, formData: FormData) {
  const admin = await ensureAdmin();
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const slug = await uniqueCourseSlug(parsed.data.title);
  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      slug,
      authorId: admin.id,
    },
  });
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await ensureAdmin();
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      coverImage: parsed.data.coverImage || null,
      published: parsed.data.published,
      restricted: formData.get("restricted") === "on",
    },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: "Сохранено" };
}

export async function togglePublish(courseId: string, published: boolean) {
  await ensureAdmin();
  await prisma.course.update({ where: { id: courseId }, data: { published } });
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

export async function deleteCourse(courseId: string) {
  await ensureAdmin();
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

/* ─────────────────────────── Модули ─────────────────────────── */

export async function createModule(courseId: string, formData: FormData) {
  await ensureAdmin();
  const parsed = moduleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const count = await prisma.module.count({ where: { courseId } });
  await prisma.module.create({
    data: { title: parsed.data.title, courseId, order: count },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: "Модуль добавлен" };
}

export async function updateModule(moduleId: string, courseId: string, title: string) {
  await ensureAdmin();
  await prisma.module.update({ where: { id: moduleId }, data: { title } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteModule(moduleId: string, courseId: string) {
  await ensureAdmin();
  await prisma.module.delete({ where: { id: moduleId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

/* ─────────────────────────── Уроки ─────────────────────────── */

export async function createLesson(moduleId: string, courseId: string, formData: FormData) {
  await ensureAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1) return { error: "Введите название урока" };

  const count = await prisma.lesson.count({ where: { moduleId } });
  const slug = await uniqueLessonSlug(moduleId, title);
  const lesson = await prisma.lesson.create({
    data: { title, slug, moduleId, order: count },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: string, courseId: string, formData: FormData) {
  await ensureAdmin();
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    videoType: formData.get("videoType") ?? "NONE",
    videoUrl: formData.get("videoUrl") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const videoError = validateVideoSource(
    parsed.data.videoType as VideoType,
    parsed.data.videoUrl
  );
  if (videoError) return { error: videoError };

  const current = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!current) return { error: "Урок не найден" };

  const slug =
    current.title !== parsed.data.title
      ? await uniqueLessonSlug(current.moduleId, parsed.data.title, lessonId)
      : current.slug;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      slug,
      content: parsed.data.content,
      videoType: parsed.data.videoType,
      videoUrl: parsed.data.videoUrl || null,
      published: parsed.data.published,
    },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  return { success: "Урок сохранён" };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await ensureAdmin();
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

/** Сохраняет новый порядок уроков внутри модуля. */
export async function reorderLessons(
  moduleId: string,
  courseId: string,
  orderedIds: string[]
) {
  await ensureAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.updateMany({
        where: { id, moduleId },
        data: { order: index },
      })
    )
  );
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Сохраняет новый порядок модулей курса. */
export async function reorderModules(courseId: string, orderedIds: string[]) {
  await ensureAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.module.updateMany({
        where: { id, courseId },
        data: { order: index },
      })
    )
  );
  revalidatePath(`/admin/courses/${courseId}`);
}

/* ─────────────────────────── Тесты ─────────────────────────── */

type QuestionInput = {
  text: string;
  type: "SINGLE" | "MULTIPLE" | "OPEN";
  points: number;
  required: boolean;
  options: { text: string; isCorrect: boolean }[];
};
type TestInput = {
  title: string;
  description: string;
  questions: QuestionInput[];
};

/** Полностью пересоздаёт тест урока по переданной структуре. */
export async function saveTest(lessonId: string, courseId: string, data: TestInput) {
  await ensureAdmin();

  const cleanQuestions = data.questions
    .filter((q) => q.text.trim().length > 0)
    .map((q, qi) => ({
      text: q.text.trim(),
      type: q.type,
      points: Math.max(1, Math.min(100, Math.round(q.points || 1))),
      required: q.required,
      order: qi,
      options:
        q.type === "OPEN"
          ? []
          : q.options
              .filter((o) => o.text.trim().length > 0)
              .map((o, oi) => ({ text: o.text.trim(), isCorrect: o.isCorrect, order: oi })),
    }));

  const existing = await prisma.test.findFirst({ where: { lessonId } });

  if (existing) {
    // удаляем старые вопросы (каскадом удалятся опции) и создаём заново
    await prisma.question.deleteMany({ where: { testId: existing.id } });
    await prisma.test.update({
      where: { id: existing.id },
      data: {
        title: data.title.trim() || "Тест",
        description: data.description.trim(),
        questions: {
          create: cleanQuestions.map((q) => ({
            text: q.text,
            type: q.type,
            points: q.points,
            required: q.required,
            order: q.order,
            options: { create: q.options },
          })),
        },
      },
    });
  } else {
    await prisma.test.create({
      data: {
        lessonId,
        title: data.title.trim() || "Тест",
        description: data.description.trim(),
        questions: {
          create: cleanQuestions.map((q) => ({
            text: q.text,
            type: q.type,
            points: q.points,
            required: q.required,
            order: q.order,
            options: { create: q.options },
          })),
        },
      },
    });
  }

  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  return { success: "Тест сохранён" };
}

export async function deleteTest(lessonId: string, courseId: string) {
  await ensureAdmin();
  await prisma.test.deleteMany({ where: { lessonId } });
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

/* ─────────────────────── Проверка ответов ─────────────────────── */

/**
 * Выставляет баллы за произвольный набор открытых ответов (возможно, из разных
 * попыток и от разных студентов). После сохранения пересчитывает баллы каждой
 * затронутой попытки и переводит её в статус «проверено», когда оценены все
 * её открытые вопросы.
 */
export async function gradeAnswers(
  entries: { answerId: string; points: number; maxPoints: number }[]
) {
  await ensureAdmin();
  if (entries.length === 0) return { success: "Нет изменений" };

  await prisma.$transaction(async (tx) => {
    const attemptIds = new Set<string>();

    for (const e of entries) {
      const points = Math.max(0, Math.min(e.maxPoints, Math.round(e.points)));
      const answer = await tx.attemptAnswer.update({
        where: { id: e.answerId },
        data: { awardedPoints: points, isCorrect: points > 0, graded: true },
      });
      attemptIds.add(answer.attemptId);
    }

    for (const attemptId of attemptIds) {
      const answers = await tx.attemptAnswer.findMany({ where: { attemptId } });
      const score = answers.reduce((s, a) => s + a.awardedPoints, 0);

      const openQuestions = await tx.question.findMany({
        where: { id: { in: answers.map((a) => a.questionId) }, type: "OPEN" },
        select: { id: true },
      });
      const openIds = new Set(openQuestions.map((q) => q.id));
      const allGraded = answers
        .filter((a) => openIds.has(a.questionId))
        .every((a) => a.graded);

      await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          status: allGraded ? "GRADED" : "SUBMITTED",
          gradedAt: allGraded ? new Date() : null,
        },
      });
    }
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { success: "Оценки сохранены" };
}

/* ─────────────────────── Управление студентами ─────────────────── */

export async function setUserRole(userId: string, role: "ADMIN" | "STUDENT") {
  await ensureAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/students");
}

export async function deleteUserAccount(_prev: unknown, formData: FormData) {
  const admin = await ensureAdmin();
  const userId = String(formData.get("userId") ?? "");
  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();

  if (!userId) return { error: "Пользователь не найден" };
  if (admin.id === userId) {
    return { error: "Нельзя удалить свой аккаунт из активной сессии" };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      _count: { select: { authoredCourses: true } },
    },
  });

  if (!target) return { error: "Пользователь уже удалён" };
  if (confirmEmail !== target.email.toLowerCase()) {
    return { error: "Введите email пользователя для подтверждения удаления" };
  }

  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return { error: "Нельзя удалить последнего администратора платформы" };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (target._count.authoredCourses > 0) {
      await tx.course.updateMany({
        where: { authorId: target.id },
        data: { authorId: admin.id },
      });
    }

    await tx.user.delete({ where: { id: target.id } });
  });

  revalidatePath("/admin/students");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/courses");
  revalidatePath("/admin");

  return { success: "Пользователь удалён" };
}
