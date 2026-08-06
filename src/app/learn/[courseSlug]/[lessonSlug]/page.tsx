import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { markLessonCompleted } from "@/lib/progress";
import { VideoPlayer } from "@/components/learn/video-player";
import { TestRunner } from "@/components/learn/test-runner";
import { ProgressRefresh } from "@/components/learn/progress-refresh";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { QuestionType, VideoType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  // Плоский список уроков для навигации «след/пред»
  const flat = course.modules.flatMap((m) => m.lessons);
  const index = flat.findIndex((l) => l.slug === lessonSlug);
  if (index === -1) notFound();

  const lesson = flat[index];
  const nextLesson = flat[index + 1] ?? null;
  const nextHref = nextLesson ? `/learn/${courseSlug}/${nextLesson.slug}` : null;

  const [progress, test, attempts] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    }),
    prisma.test.findFirst({
      where: { lessonId: lesson.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id, test: { lessonId: lesson.id } },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
  ]);

  const lastAttempt = attempts[0] ?? null;
  const hasRequiredTest = Boolean(test && test.questions.length > 0);
  const shouldAutoComplete = !hasRequiredTest || Boolean(lastAttempt);
  const autoCompletedNow = shouldAutoComplete && !progress?.completed;
  if (autoCompletedNow) {
    await markLessonCompleted(user.id, lesson.id);
  }
  if (lastAttempt && !nextHref) {
    redirect(`/courses/${courseSlug}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {autoCompletedNow && <ProgressRefresh />}
      <p className="text-sm text-muted-foreground">Урок {index + 1} из {flat.length}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>

      {lesson.videoType !== "NONE" && lesson.videoUrl && (
        <div id="video" className="mt-6 scroll-mt-24">
          <VideoPlayer videoType={lesson.videoType as VideoType} videoUrl={lesson.videoUrl} />
        </div>
      )}

      {lesson.content && (
        <div
          id="content"
          className="prose-lesson mt-8 scroll-mt-24 text-[15px]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content) }}
        />
      )}

      {/* Тест урока */}
      {test && test.questions.length > 0 && (
        <div id="test" className="mt-10 scroll-mt-24">
          {lastAttempt ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{test.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Вы уже проходили этот тест {formatDateTime(lastAttempt.createdAt)}.
              </p>
              <p className="mt-3 text-sm">
                Результат:{" "}
                <span className="font-semibold">
                  {lastAttempt.score} из {lastAttempt.maxScore}
                </span>{" "}
                баллов ·{" "}
                {lastAttempt.status === "GRADED" ? (
                  <span className="text-success">проверено</span>
                ) : (
                  <span className="text-warning">ожидает проверки открытых вопросов</span>
                )}
              </p>
            </div>
          ) : (
            <TestRunner
              completionHref={!nextHref ? `/courses/${courseSlug}` : undefined}
              test={{
                id: test.id,
                title: test.title,
                description: test.description,
                questions: test.questions.map((q) => ({
                  id: q.id,
                  text: q.text,
                  type: q.type as QuestionType,
                  points: q.points,
                  required: q.required,
                  options: q.options.map((o) => ({ id: o.id, text: o.text })),
                })),
              }}
            />
          )}
        </div>
      )}

      {nextHref && (
        <div className="mt-10 border-t border-border pt-6">
          <Link href={nextHref} className={buttonVariants()}>
            Следующий урок <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
