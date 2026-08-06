import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BookOpen,
  PlayCircle,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Users,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { getCourseBySlug, getCourseProgress, isEnrolled } from "@/lib/courses";
import { canAccessCourseBySlug } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { enrollAction } from "@/lib/course-actions";
import { buttonVariants } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/media-url";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course?.title ?? "Курс" };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course || !course.published) notFound();

  // Курс, закрытый группами, не должен открываться по прямой ссылке.
  const viewer = await getCurrentUser();
  if (!viewer) notFound();
  if (!(await canAccessCourseBySlug(viewer, slug))) notFound();

  const user = await getCurrentUser();
  const enrolled = user ? await isEnrolled(user.id, course.id) : false;
  const progress =
    user && enrolled ? await getCourseProgress(user.id, course.id) : null;
  const coverSrc = mediaUrl(course.coverImage);

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Основной контент */}
        <div>
          <BackLink href="/courses">Все курсы</BackLink>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4" />
              {course.modules.length} {plural(course.modules.length, ["модуль", "модуля", "модулей"])}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="size-4" />
              {totalLessons} {plural(totalLessons, ["урок", "урока", "уроков"])}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {course._count.enrollments} {plural(course._count.enrollments, ["студент", "студента", "студентов"])}
            </span>
          </div>

          {course.description && (
            <p className="mt-6 whitespace-pre-line text-pretty leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          )}

          {/* Программа курса */}
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">Программа курса</h2>
            <div className="space-y-4">
              {course.modules.map((m, mi) => (
                <div key={m.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
                      {mi + 1}
                    </span>
                    <h3 className="font-medium">{m.title}</h3>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {m.lessons.length} {plural(m.lessons.length, ["урок", "урока", "уроков"])}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {m.lessons.map((l) => {
                      const done = progress?.completedIds.has(l.id);
                      const lessonHref = `/learn/${course.slug}/${l.slug}`;
                      const mainHref =
                        l.videoType !== "NONE"
                          ? `${lessonHref}#video`
                          : l.tests.length > 0
                            ? `${lessonHref}#test`
                            : `${lessonHref}#content`;
                      const Icon = done ? CheckCircle2 : l.videoType !== "NONE" ? PlayCircle : FileText;
                      const iconClassName = done
                        ? "text-success"
                        : l.videoType !== "NONE"
                          ? "text-primary"
                          : "text-muted-foreground";
                      const titleClassName = done ? "text-foreground" : "";

                      const lessonBody = (
                        <>
                          <Icon className={`size-4 shrink-0 ${iconClassName}`} />
                          <span className={titleClassName}>{l.title}</span>
                          {enrolled && <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                        </>
                      );

                      return (
                        <li key={l.id} className="flex flex-wrap items-center gap-2 p-3 text-sm sm:flex-nowrap">
                          {enrolled ? (
                            <Link
                              href={mainHref}
                              className="group flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted hover:text-primary"
                            >
                              {lessonBody}
                            </Link>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                              {lessonBody}
                            </div>
                          )}
                          {enrolled && l.videoType !== "NONE" && (
                            <Link href={`${lessonHref}#video`} className="ml-9 sm:ml-0">
                              <Badge variant="muted" className="transition-colors hover:bg-primary hover:text-primary-foreground">
                                <PlayCircle className="size-3" /> Видео
                              </Badge>
                            </Link>
                          )}
                          {l.tests.length > 0 && (
                            enrolled ? (
                              <Link href={`${lessonHref}#test`} className="ml-9 sm:ml-0">
                                <Badge variant="muted" className="transition-colors hover:bg-primary hover:text-primary-foreground">
                                  <ClipboardCheck className="size-3" /> Тест
                                </Badge>
                              </Link>
                            ) : (
                              <Badge variant="muted" className="ml-9 sm:ml-0">
                                <ClipboardCheck className="size-3" /> Тест
                              </Badge>
                            )
                          )}
                        </li>
                      );
                    })}
                    {m.lessons.length === 0 && (
                      <li className="p-4 text-sm text-muted-foreground">
                        Уроки скоро появятся
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Сайдбар с действием */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 aspect-video overflow-hidden rounded-md bg-muted">
              {coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverSrc} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-gradient-to-br from-primary/15 to-fuchsia-500/15">
                  <BookOpen className="size-10 text-primary/40" />
                </div>
              )}
            </div>

            {enrolled && progress ? (
              <>
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Ваш прогресс</span>
                    <span className="font-medium">{progress.percent}%</span>
                  </div>
                  <Progress value={progress.percent} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Пройдено {progress.completed} из {progress.total}
                  </p>
                </div>
                <Link href={`/learn/${course.slug}`} className={buttonVariants({ size: "lg", className: "w-full" })}>
                  {progress.completed > 0 ? "Продолжить обучение" : "Начать обучение"}
                </Link>
              </>
            ) : user ? (
              <form action={enrollAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <button type="submit" className={buttonVariants({ size: "lg", className: "w-full" })}>
                  Записаться бесплатно
                </button>
              </form>
            ) : (
              <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
                <Lock className="size-4" /> Войти, чтобы записаться
              </Link>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Автор: {course.author.name}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
