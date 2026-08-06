"use server";

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

