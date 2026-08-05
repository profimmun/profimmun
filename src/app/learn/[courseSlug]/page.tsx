import { redirect, notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function LearnIndex({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  const firstLesson = course.modules
    .flatMap((m) => m.lessons)
    .find(Boolean);

  if (!firstLesson) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <p className="text-lg font-medium">В этом курсе пока нет уроков</p>
          <p className="text-sm text-muted-foreground">Загляните позже.</p>
        </div>
      </div>
    );
  }

  redirect(`/learn/${courseSlug}/${firstLesson.slug}`);
}
