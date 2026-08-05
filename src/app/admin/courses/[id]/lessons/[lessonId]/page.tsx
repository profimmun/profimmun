import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { prisma } from "@/lib/prisma";
import { LessonEditForm } from "@/components/admin/lesson-edit-form";
import { TestBuilder } from "@/components/admin/test-builder";
import type { QuestionType, VideoType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { title: true, courseId: true } },
      tests: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!lesson || lesson.module.courseId !== courseId) notFound();

  const test = lesson.tests[0] ?? null;
  const initialTest = test
    ? {
        title: test.title,
        description: test.description,
        questions: test.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type as QuestionType,
          points: q.points,
          required: q.required,
          options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <BackLink href={`/admin/courses/${courseId}`}>{lesson.module.title}</BackLink>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Редактирование урока</h1>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <LessonEditForm
          lesson={{
            id: lesson.id,
            courseId,
            title: lesson.title,
            content: lesson.content,
            videoType: lesson.videoType as VideoType,
            videoUrl: lesson.videoUrl,
            published: lesson.published,
          }}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="size-5 text-primary" /> Тест урока
        </h2>
        <TestBuilder lessonId={lesson.id} courseId={courseId} initial={initialTest} />
      </section>
    </div>
  );
}
