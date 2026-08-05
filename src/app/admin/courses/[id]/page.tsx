import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CourseSettingsForm } from "@/components/admin/course-settings-form";
import { ModulesManager } from "@/components/admin/modules-manager";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      groups: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { tests: { select: { id: true } } },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const modules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      hasVideo: l.videoType !== "NONE",
      hasTest: l.tests.length > 0,
      published: l.published,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/courses">Все курсы</BackLink>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={course.published ? "success" : "muted"}>
              {course.published ? "Опубликован" : "Черновик"}
            </Badge>
            {course.published && (
              <Link
                href={`/courses/${course.slug}`}
                target="_blank"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <ExternalLink className="size-4" /> Открыть
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Кто имеет доступ к курсу */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        {!course.restricted ? (
          <p className="text-muted-foreground">
            <strong className="font-medium text-foreground">Доступ: всем студентам.</strong>{" "}
            Курс открывается сразу после регистрации — добавлять никого вручную не нужно.
            Чтобы ограничить, включите «Доступ только для групп» в настройках справа.
          </p>
        ) : course.groups.length === 0 ? (
          <p className="text-warning">
            <strong className="font-medium">Доступ ограничен, но группы не назначены.</strong>{" "}
            Сейчас курс не видит ни один студент. Назначьте группы в разделе{" "}
            <Link href="/admin/groups" className="underline">
              Группы
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Доступ только группам:</span>
            {course.groups.map((g) => (
              <Link key={g.id} href={`/admin/groups/${g.id}`}>
                <Badge variant="default">{g.name}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Программа курса */}
        <div className="order-2 min-w-0 lg:order-1">
          <h2 className="mb-4 text-lg font-semibold">Программа курса</h2>
          <ModulesManager courseId={course.id} modules={modules} />
        </div>

        {/* Настройки */}
        <div className="lg:order-2 order-1">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="mb-4 text-lg font-semibold">Настройки курса</h2>
            <CourseSettingsForm
              course={{
                id: course.id,
                title: course.title,
                description: course.description,
                coverImage: course.coverImage,
                published: course.published,
                restricted: course.restricted,
                groupCount: course.groups.length,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
