import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { Progress } from "./ui/progress";
import { mediaUrl } from "@/lib/media-url";
import { plural } from "@/lib/utils";

type CourseCardData = {
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  modules: number;
  students: number;
  progress?: number; // 0..100, если студент записан
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const coverSrc = mediaUrl(course.coverImage);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={course.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-primary/15 to-fuchsia-500/15">
            <BookOpen className="size-10 text-primary/40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-tight tracking-tight group-hover:text-primary">
          {course.title}
        </h3>
        {course.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {course.modules} {plural(course.modules, ["модуль", "модуля", "модулей"])}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {course.students}
          </span>
        </div>

        {course.progress !== undefined && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Прогресс</span>
              <span>{Math.round(course.progress)}%</span>
            </div>
            <Progress value={course.progress} />
          </div>
        )}
      </div>
    </Link>
  );
}
