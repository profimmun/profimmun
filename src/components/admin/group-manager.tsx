"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Users2, BookOpen, Loader2 } from "lucide-react";
import { toggleGroupMember, toggleGroupCourse } from "@/lib/group-actions";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; email: string; member: boolean };
type CourseRow = { id: string; title: string; published: boolean; allowed: boolean };

/** Двухпанельный менеджер: участники группы и доступные ей курсы. */
export function GroupManager({
  groupId,
  students,
  courses,
}: {
  groupId: string;
  students: Person[];
  courses: CourseRow[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MembersPanel groupId={groupId} students={students} />
      <CoursesPanel groupId={groupId} courses={courses} />
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  count,
  children,
}: {
  icon: typeof Users2;
  title: string;
  hint: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4.5 text-primary" />
          <h2 className="font-semibold">{title}</h2>
          <span className="ml-auto text-sm text-muted-foreground">{count}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </header>
      {children}
    </section>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative border-b border-border p-3">
      <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function ToggleRow({
  checked,
  onToggle,
  pending,
  title,
  subtitle,
  badge,
}: {
  checked: boolean;
  onToggle: () => void;
  pending: boolean;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        disabled={pending}
        role="switch"
        aria-checked={checked}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
          )}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            checked && <Check className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        {badge}
      </button>
    </li>
  );
}

function MembersPanel({ groupId, students }: { groupId: string; students: Person[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useOptimistic(
    students,
    (currentRows, update: { id: string; member: boolean }) =>
      currentRows.map((r) => (r.id === update.id ? { ...r, member: update.member } : r))
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  const filtered = rows.filter((s) => {
    const q = query.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });
  const memberCount = rows.filter((r) => r.member).length;

  function toggle(person: Person) {
    const next = !person.member;
    setBusy(person.id);
    start(async () => {
      setRows({ id: person.id, member: next });
      await toggleGroupMember(groupId, person.id, next);
      setBusy(null);
      router.refresh();
    });
  }

  return (
    <Panel
      icon={Users2}
      title="Участники"
      hint="Отметьте студентов, которые входят в группу"
      count={`${memberCount} из ${rows.length}`}
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Поиск по имени или email" />
      {filtered.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {rows.length === 0 ? "Студентов пока нет." : "Никто не найден."}
        </p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {filtered.map((s) => (
            <ToggleRow
              key={s.id}
              checked={s.member}
              pending={busy === s.id}
              onToggle={() => toggle(s)}
              title={s.name}
              subtitle={s.email}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function CoursesPanel({ groupId, courses }: { groupId: string; courses: CourseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useOptimistic(
    courses,
    (currentRows, update: { id: string; allowed: boolean }) =>
      currentRows.map((r) => (r.id === update.id ? { ...r, allowed: update.allowed } : r))
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  const filtered = rows.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || c.title.toLowerCase().includes(q);
  });
  const allowedCount = rows.filter((r) => r.allowed).length;

  function toggle(course: CourseRow) {
    const next = !course.allowed;
    setBusy(course.id);
    start(async () => {
      setRows({ id: course.id, allowed: next });
      await toggleGroupCourse(groupId, course.id, next);
      setBusy(null);
      router.refresh();
    });
  }

  return (
    <Panel
      icon={BookOpen}
      title="Доступные курсы"
      hint="Курсы, которые видят участники этой группы"
      count={`${allowedCount} из ${rows.length}`}
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Поиск по курсам" />
      {filtered.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {rows.length === 0 ? "Курсов пока нет." : "Ничего не найдено."}
        </p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {filtered.map((c) => (
            <ToggleRow
              key={c.id}
              checked={c.allowed}
              pending={busy === c.id}
              onToggle={() => toggle(c)}
              title={c.title}
              subtitle={c.published ? "Опубликован" : "Черновик"}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
