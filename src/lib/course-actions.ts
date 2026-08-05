"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { canAccessCourse } from "./access";

/** Запись студента на курс с последующим переходом к обучению. */
export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId"));
  const slug = String(formData.get("slug"));

  // Нельзя записаться на курс, закрытый группами.
  if (!(await canAccessCourse(user, courseId))) {
    redirect("/courses");
  }

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {},
    create: { userId: user.id, courseId },
  });

  redirect(`/learn/${slug}`);
}

/** Отмечает урок пройденным/непройденным. */
export async function setLessonComplete(lessonId: string, completed: boolean) {
  const user = await requireUser();

  // Отмечать можно только уроки доступного курса.
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  if (!lesson) throw new Error("LESSON_NOT_FOUND");
  if (!(await canAccessCourse(user, lesson.module.courseId))) {
    throw new Error("FORBIDDEN");
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { completed, completedAt: completed ? new Date() : null },
    create: {
      userId: user.id,
      lessonId,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  revalidatePath("/learn", "layout");
  revalidatePath("/dashboard");
}
