import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoscowDateTime, plural } from "@/lib/utils";
import { createXlsx, type XlsxSheet } from "@/lib/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportUser = {
  id: string;
  label: string;
};

type QuestionExportRow = {
  id: string;
  course: string;
  module: string;
  moduleOrder: number;
  lesson: string;
  lessonOrder: number;
  test: string;
  question: string;
  questionOrder: number;
  type: string;
  points: number;
  answersByUser: Map<string, string[]>;
};

function answerType(type: string): string {
  if (type === "OPEN") return "Открытый ответ";
  if (type === "MULTIPLE") return "Несколько вариантов";
  return "Один вариант";
}

function userLabel(name: string, email: string): string {
  return `${name || "Без имени"}\n${email}`;
}

function selectedAnswerText(
  selectedIds: string,
  options: Array<{ id: string; text: string }>
): string {
  const optionText = new Map(options.map((option) => [option.id, option.text]));
  const answers = selectedIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => optionText.get(id) ?? id);

  return answers.length > 0 ? answers.join("; ") : "—";
}

function statusLabel(status: string, graded: boolean): string {
  if (status === "SUBMITTED" && !graded) return "ждёт проверки";
  if (status === "GRADED" || graded) return "проверено";
  return status.toLowerCase();
}

function excelFileName(scope: string | null): string {
  const date = new Date().toISOString().slice(0, 10);
  return `answers-${scope ?? "all"}-${date}.xlsx`;
}

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");
  } catch {
    return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const lessonId = url.searchParams.get("lessonId");

  const testFilter: Prisma.TestWhereInput = {};
  if (lessonId) testFilter.lessonId = lessonId;
  if (courseId) testFilter.lesson = { module: { courseId } };

  const where: Prisma.TestAttemptWhereInput = {
    status: { in: ["SUBMITTED", "GRADED"] },
  };
  if (courseId || lessonId) where.test = testFilter;

  const attempts = await prisma.testAttempt.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      submittedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      answers: {
        select: {
          questionId: true,
          selectedIds: true,
          openAnswer: true,
          awardedPoints: true,
          graded: true,
        },
      },
      test: {
        select: {
          id: true,
          title: true,
          lesson: {
            select: {
              title: true,
              order: true,
              module: {
                select: {
                  title: true,
                  order: true,
                  course: { select: { title: true } },
                },
              },
            },
          },
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              text: true,
              type: true,
              points: true,
              order: true,
              options: {
                orderBy: { order: "asc" },
                select: { id: true, text: true },
              },
            },
          },
        },
      },
    },
  });

  const usersById = new Map<string, ExportUser>();
  const questionsById = new Map<string, QuestionExportRow>();
  const attemptRows: Array<Array<string | number>> = [
    ["Студент", "Email", "Курс", "Модуль", "Урок", "Тест", "Дата отправки", "Статус", "Баллы", "Макс. балл"],
  ];

  for (const attempt of attempts) {
    const lesson = attempt.test.lesson;
    if (!lesson) continue;

    usersById.set(attempt.user.id, {
      id: attempt.user.id,
      label: userLabel(attempt.user.name, attempt.user.email),
    });

    const courseTitle = lesson.module.course.title;
    const moduleTitle = lesson.module.title;
    const lessonTitle = lesson.title;
    const submittedAt = attempt.submittedAt ?? attempt.createdAt;
    const submittedAtLabel = formatMoscowDateTime(submittedAt);

    attemptRows.push([
      attempt.user.name || "Без имени",
      attempt.user.email,
      courseTitle,
      moduleTitle,
      lessonTitle,
      attempt.test.title,
      submittedAtLabel,
      attempt.status === "SUBMITTED" ? "ждёт проверки" : "проверено",
      attempt.score,
      attempt.maxScore,
    ]);

    const answersByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));

    for (const question of attempt.test.questions) {
      const row =
        questionsById.get(question.id) ??
        ({
          id: question.id,
          course: courseTitle,
          module: moduleTitle,
          moduleOrder: lesson.module.order,
          lesson: lessonTitle,
          lessonOrder: lesson.order,
          test: attempt.test.title,
          question: question.text,
          questionOrder: question.order,
          type: answerType(question.type),
          points: question.points,
          answersByUser: new Map<string, string[]>(),
        } satisfies QuestionExportRow);

      const answer = answersByQuestion.get(question.id);
      if (answer) {
        const text =
          question.type === "OPEN"
            ? answer.openAnswer.trim() || "—"
            : selectedAnswerText(answer.selectedIds, question.options);
        const lines = [
          submittedAtLabel,
          `Ответ: ${text}`,
          `Баллы: ${answer.awardedPoints} из ${question.points}`,
          `Статус: ${statusLabel(attempt.status, answer.graded)}`,
        ];

        const userAnswers = row.answersByUser.get(attempt.user.id) ?? [];
        userAnswers.push(lines.join("\n"));
        row.answersByUser.set(attempt.user.id, userAnswers);
      }

      questionsById.set(question.id, row);
    }
  }

  const users = Array.from(usersById.values()).sort((a, b) => a.label.localeCompare(b.label, "ru"));
  const questionRows = Array.from(questionsById.values()).sort(
    (a, b) =>
      a.course.localeCompare(b.course, "ru") ||
      a.moduleOrder - b.moduleOrder ||
      a.module.localeCompare(b.module, "ru") ||
      a.lessonOrder - b.lessonOrder ||
      a.lesson.localeCompare(b.lesson, "ru") ||
      a.test.localeCompare(b.test, "ru") ||
      a.questionOrder - b.questionOrder
  );

  const answersRows: XlsxSheet["rows"] =
    questionRows.length > 0
      ? [
          [
            "Вопрос",
            ...users.map((user) => user.label),
            "Курс",
            "Модуль",
            "Урок",
            "Тест",
            "Тип вопроса",
            "Макс. балл",
          ],
          ...questionRows.map((row) => [
            row.question,
            ...users.map((user) => row.answersByUser.get(user.id)?.join("\n\n") ?? ""),
            row.course,
            row.module,
            row.lesson,
            row.test,
            row.type,
            row.points,
          ]),
        ]
      : [["Ответов пока нет"]];

  const sheets: XlsxSheet[] = [
    {
      name: "Ответы по вопросам",
      rows: answersRows,
      widths: [44, ...users.map(() => 34), 28, 24, 28, 24, 20, 12],
    },
    {
      name: "Попытки",
      rows:
        attemptRows.length > 1
          ? attemptRows
          : [["Попыток пока нет", "", "", "", "", "", "", "", "", ""]],
      widths: [24, 30, 28, 24, 28, 24, 22, 18, 12, 12],
    },
    {
      name: "Описание",
      rows: [
        ["Что выгружено", courseId ? "Ответы выбранного курса" : lessonId ? "Ответы выбранного урока" : "Все ответы"],
        [
          "Формат",
          "На первом листе первая колонка — вопросы, дальше по колонкам идут пользователи и их ответы. Если студент проходил тест несколько раз, ответы в ячейке перечислены по датам.",
        ],
        ["Всего пользователей", users.length],
        ["Всего вопросов с ответами", questionRows.length],
        ["Всего попыток", Math.max(0, attemptRows.length - 1)],
        [
          "Подсказка",
          `${users.length} ${plural(users.length, ["пользователь", "пользователя", "пользователей"])} в колонках ответов.`,
        ],
      ],
      widths: [24, 96],
    },
  ];

  const body = createXlsx(sheets);
  const arrayBuffer = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength
  ) as ArrayBuffer;
  const filename = excelFileName(lessonId ?? courseId);

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
