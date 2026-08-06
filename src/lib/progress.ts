import "server-only";

import { prisma } from "./prisma";

export async function markLessonCompleted(userId: string, lessonId: string) {
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: {
      userId,
      lessonId,
      completed: true,
      completedAt: new Date(),
    },
  });
}
