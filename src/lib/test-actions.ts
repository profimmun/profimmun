"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { canAccessCourse } from "./access";

export type AnswerPayload = {
  questionId: string;
  selectedIds: string[];
  openAnswer: string;
};

export type TestResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  autoMax: number; // максимум по авто-проверяемым вопросам
  needsReview: boolean;
};

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

/** Принимает ответы студента, оценивает закрытые вопросы, сохраняет попытку. */
export async function submitTest(
  testId: string,
  answers: AnswerPayload[]
): Promise<TestResult> {
  const user = await requireUser();

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: { include: { options: true } },
      lesson: { select: { module: { select: { courseId: true } } } },
    },
  });
  if (!test) throw new Error("TEST_NOT_FOUND");

  // Тест принадлежит курсу — значит должен подчиняться тем же правилам доступа,
  // что и сам курс. Иначе тест закрытого курса можно было бы пройти по прямому
  // вызову экшена, минуя ограничение по группам.
  const courseId = test.lesson?.module.courseId;
  if (!courseId) throw new Error("TEST_NOT_LINKED");
  if (!(await canAccessCourse(user, courseId))) throw new Error("FORBIDDEN");

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  // Обязательные вопросы должны быть заполнены. Клиент это уже проверяет —
  // здесь страховка от обхода интерфейса. Необязательные пропускаем.
  for (const q of test.questions) {
    if (!q.required) continue;
    const a = answerMap.get(q.id);
    const filled =
      q.type === "OPEN"
        ? (a?.openAnswer?.trim().length ?? 0) > 0
        : (a?.selectedIds?.length ?? 0) > 0;
    if (!filled) throw new Error("ANSWER_ALL_REQUIRED");
  }

  let score = 0;
  let maxScore = 0;
  let autoMax = 0;
  let needsReview = false;

  const attemptAnswers = test.questions.map((q) => {
    maxScore += q.points;
    const given = answerMap.get(q.id);

    if (q.type === "OPEN") {
      needsReview = true;
      return {
        questionId: q.id,
        selectedIds: "",
        openAnswer: given?.openAnswer?.slice(0, 5000) ?? "",
        awardedPoints: 0,
        isCorrect: null as boolean | null,
        graded: false,
      };
    }

    // Закрытый вопрос — авто-проверка
    autoMax += q.points;
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const selected = (given?.selectedIds ?? []).filter((id) =>
      q.options.some((o) => o.id === id)
    );
    const correct = sameSet(selected, correctIds) && selected.length > 0;
    const awarded = correct ? q.points : 0;
    score += awarded;

    return {
      questionId: q.id,
      selectedIds: selected.join(","),
      openAnswer: "",
      awardedPoints: awarded,
      isCorrect: correct,
      graded: true,
    };
  });

  const attempt = await prisma.testAttempt.create({
    data: {
      testId,
      userId: user.id,
      status: needsReview ? "SUBMITTED" : "GRADED",
      score,
      maxScore,
      submittedAt: new Date(),
      gradedAt: needsReview ? null : new Date(),
      answers: { create: attemptAnswers },
    },
  });

  revalidatePath("/dashboard");

  return {
    attemptId: attempt.id,
    score,
    maxScore,
    autoMax,
    needsReview,
  };
}
