import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBySlug, getCourseProgress, isEnrolled } from "@/lib/courses";
import { canAccessCourse } from "@/lib/access";
import { LessonSidebar } from "@/components/learn/lesson-sidebar";

export const dynamic = "force-dynamic";

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  // Доступ к курсу мог быть отозван вместе с группой — проверяем до записи.
  if (!(await canAccessCourse(user, course.id))) notFound();

  if (!(await isEnrolled(user.id, course.id))) {
    redirect(`/courses/${courseSlug}`);
  }

  const progress = await getCourseProgress(user.id, course.id);

  const modules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      hasVideo: l.videoType !== "NONE",
      hasTest: l.tests.length > 0,
    })),
  }));

  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr]">
      <LessonSidebar
        courseSlug={courseSlug}
        courseTitle={course.title}
        modules={modules}
        completedIds={[...progress.completedIds]}
        percent={progress.percent}
      />
      <div className="min-h-screen min-w-0">{children}</div>
    </div>
  );
}
