/**
 * Переносит данные из data-backup.json (выгрузка старой SQLite-базы)
 * в текущую базу PostgreSQL.
 *
 *   node scripts/import-backup.mjs
 *
 * Идемпотентен: записи создаются через upsert по id, поэтому повторный запуск
 * ничего не сломает. Порядок вставки учитывает внешние ключи.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const FILE = "data-backup.json";

if (!existsSync(FILE)) {
  console.error(`Файл ${FILE} не найден — переносить нечего.`);
  process.exit(1);
}

const db = new PrismaClient();
const data = JSON.parse(readFileSync(FILE, "utf8"));

const d = (v) => (v === null || v === undefined ? v : new Date(v));

async function upsertAll(label, rows, fn) {
  let n = 0;
  for (const row of rows ?? []) {
    await fn(row);
    n++;
  }
  console.log(`  ${label}: ${n}`);
}

try {
  console.log("Перенос данных в PostgreSQL…");

  await upsertAll("пользователи", data.users, (u) =>
    db.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        role: u.role,
        avatarUrl: u.avatarUrl,
        createdAt: d(u.createdAt),
        updatedAt: d(u.updatedAt),
      },
    })
  );

  await upsertAll("курсы", data.courses, (c) =>
    db.course.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        coverImage: c.coverImage,
        published: c.published,
        restricted: c.restricted ?? false,
        authorId: c.authorId,
        createdAt: d(c.createdAt),
        updatedAt: d(c.updatedAt),
      },
    })
  );

  await upsertAll("модули", data.modules, (m) =>
    db.module.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        order: m.order,
        courseId: m.courseId,
        createdAt: d(m.createdAt),
      },
    })
  );

  await upsertAll("уроки", data.lessons, (l) =>
    db.lesson.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        title: l.title,
        slug: l.slug,
        content: l.content,
        videoType: l.videoType,
        videoUrl: l.videoUrl,
        order: l.order,
        published: l.published,
        moduleId: l.moduleId,
        createdAt: d(l.createdAt),
        updatedAt: d(l.updatedAt),
      },
    })
  );

  await upsertAll("группы", data.groups, (g) =>
    db.group.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        createdAt: d(g.createdAt),
        updatedAt: d(g.updatedAt),
        members: { connect: (g.members ?? []).map((m) => ({ id: m.id })) },
        courses: { connect: (g.courses ?? []).map((c) => ({ id: c.id })) },
      },
    })
  );

  await upsertAll("записи на курсы", data.enrollments, (e) =>
    db.enrollment.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        createdAt: d(e.createdAt),
      },
    })
  );

  await upsertAll("прогресс", data.progress, (p) =>
    db.lessonProgress.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        userId: p.userId,
        lessonId: p.lessonId,
        completed: p.completed,
        completedAt: d(p.completedAt),
        createdAt: d(p.createdAt),
      },
    })
  );

  await upsertAll("тесты", data.tests, (t) =>
    db.test.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        lessonId: t.lessonId,
        createdAt: d(t.createdAt),
        updatedAt: d(t.updatedAt),
      },
    })
  );

  await upsertAll("вопросы", data.questions, (q) =>
    db.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        testId: q.testId,
        text: q.text,
        type: q.type,
        points: q.points,
        order: q.order,
      },
    })
  );

  await upsertAll("варианты ответов", data.options, (o) =>
    db.answerOption.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        questionId: o.questionId,
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order,
      },
    })
  );

  await upsertAll("попытки", data.attempts, (a) =>
    db.testAttempt.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        testId: a.testId,
        userId: a.userId,
        status: a.status,
        score: a.score,
        maxScore: a.maxScore,
        submittedAt: d(a.submittedAt),
        gradedAt: d(a.gradedAt),
        createdAt: d(a.createdAt),
      },
    })
  );

  await upsertAll("ответы", data.answers, (a) =>
    db.attemptAnswer.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        attemptId: a.attemptId,
        questionId: a.questionId,
        selectedIds: a.selectedIds,
        openAnswer: a.openAnswer,
        awardedPoints: a.awardedPoints,
        isCorrect: a.isCorrect,
        graded: a.graded,
      },
    })
  );

  console.log("Готово. Пароли пользователей сохранены — входить можно как раньше.");
} finally {
  await db.$disconnect();
}
