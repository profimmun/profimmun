import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  AnswersReview,
  type ReviewQuestion,
  type ReviewAnswer,
} from "@/components/admin/answers-review";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import type { QuestionType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewsAnswersPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      module: {
        select: {
          title: true,
          courseId: true,
          course: { select: { id: true, title: true } },
        },
      },
      tests: {
        select: {
          id: true,
          title: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              text: true,
              type: true,
              points: true,
              options: { select: { id: true, text: true, isCorrect: true } },
            },
          },
          attempts: {
            where: { status: { in: ["SUBMITTED", "GRADED"] } },
            orderBy: { submittedAt: "asc" },
            select: {
              id: true,
              submittedAt: true,
              user: { select: { name: true, email: true } },
              answers: true,
            },
          },
        },
      },
    },
  });

  if (!lesson || lesson.module.courseId !== courseId) notFound();

  const test = lesson.tests[0] ?? null;

  const questions: ReviewQuestion[] = (test?.questions ?? []).map((q) => {
    const optionText = new Map(q.options.map((o) => [o.id, o.text]));

    const answers: ReviewAnswer[] = (test?.attempts ?? [])
      .map((attempt) => {
        const ans = attempt.answers.find((a) => a.questionId === q.id);
        if (!ans) return null;

        const text =
          q.type === "OPEN"
            ? ans.openAnswer
            : ans.selectedIds
                .split(",")
                .map((id) => optionText.get(id.trim()))
                .filter(Boolean)
                .join(", ");

        return {
          answerId: ans.id,
          studentName: attempt.user.name,
          studentEmail: attempt.user.email,
          text,
          awarded: ans.awardedPoints,
          graded: ans.graded,
          isCorrect: ans.isCorrect,
          submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
        } satisfies ReviewAnswer;
      })
      .filter((a): a is ReviewAnswer => a !== null);

    return {
      id: q.id,
      text: q.text,
      type: q.type as QuestionType,
      points: q.points,
      answers,
    };
  });

  const withAnswers = questions.filter((q) => q.answers.length > 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Проверка ответов", href: "/admin/reviews" },
          { label: lesson.module.course.title, href: `/admin/reviews/${courseId}` },
          { label: lesson.title },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {lesson.module.title}
            {test && ` · ${test.title}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/answers-export?lessonId=${lessonId}`}
            download
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" /> Выгрузить ответы урока
          </a>
          <Link
            href={`/admin/courses/${courseId}/lessons/${lessonId}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Pencil className="size-4" /> Редактировать урок
          </Link>
        </div>
      </div>

      <AnswersReview questions={withAnswers} />
    </div>
  );
}
