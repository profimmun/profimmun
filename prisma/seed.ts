import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@platforma.local";
  const studentEmail = "student@platforma.local";
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Администратор",
      role: "ADMIN",
      passwordHash,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      name: "Анна Студентова",
      role: "STUDENT",
      passwordHash,
    },
  });

  // Демонстрационный курс — создаём только если его ещё нет
  const existing = await prisma.course.findUnique({
    where: { slug: "osnovy-web-razrabotki" },
  });

  if (!existing) {
    const course = await prisma.course.create({
      data: {
        title: "Основы веб-разработки",
        slug: "osnovy-web-razrabotki",
        description:
          "Практический курс для новичков: HTML, CSS и JavaScript с нуля. Вы создадите свой первый сайт и разберётесь, как устроен современный веб.",
        published: true,
        authorId: admin.id,
        modules: {
          create: [
            {
              title: "Введение",
              order: 0,
              lessons: {
                create: [
                  {
                    title: "Как работает интернет",
                    slug: "kak-rabotaet-internet",
                    order: 0,
                    videoType: "YOUTUBE",
                    videoUrl: "https://www.youtube.com/watch?v=a_-Chmp3ns0",
                    content:
                      "# Как работает интернет\n\nВ этом уроке разберём, что происходит, когда вы открываете сайт: **DNS**, **HTTP** и роль браузера.\n\n- Клиент и сервер\n- Запрос и ответ\n- Что такое HTML-страница",
                  },
                  {
                    title: "Инструменты разработчика",
                    slug: "instrumenty-razrabotchika",
                    order: 1,
                    content:
                      "## Инструменты\n\nУстановим редактор кода и познакомимся с DevTools браузера.",
                  },
                ],
              },
            },
            {
              title: "HTML и CSS",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Разметка HTML",
                    slug: "razmetka-html",
                    order: 0,
                    content:
                      "## HTML\n\nТеги, атрибуты и структура документа. Создаём первую страницу.",
                  },
                  {
                    title: "Стилизация с CSS",
                    slug: "stilizaciya-css",
                    order: 1,
                    content:
                      "## CSS\n\nСелекторы, коробочная модель и flexbox для раскладки.",
                  },
                ],
              },
            },
          ],
        },
      },
      include: { modules: { include: { lessons: true } } },
    });

    // Тест к первому уроку с закрытыми и открытым вопросами
    const firstLesson = course.modules[0].lessons[0];
    await prisma.test.create({
      data: {
        title: "Проверка: основы интернета",
        description: "Небольшой тест по первому уроку.",
        lessonId: firstLesson.id,
        questions: {
          create: [
            {
              text: "Что такое HTTP?",
              type: "SINGLE",
              points: 1,
              order: 0,
              options: {
                create: [
                  { text: "Протокол передачи гипертекста", isCorrect: true, order: 0 },
                  { text: "Язык программирования", isCorrect: false, order: 1 },
                  { text: "Тип базы данных", isCorrect: false, order: 2 },
                ],
              },
            },
            {
              text: "Выберите всё, что относится к фронтенду:",
              type: "MULTIPLE",
              points: 2,
              order: 1,
              options: {
                create: [
                  { text: "HTML", isCorrect: true, order: 0 },
                  { text: "CSS", isCorrect: true, order: 1 },
                  { text: "PostgreSQL", isCorrect: false, order: 2 },
                  { text: "JavaScript", isCorrect: true, order: 3 },
                ],
              },
            },
            {
              text: "Своими словами объясните, что делает браузер при открытии сайта.",
              type: "OPEN",
              points: 3,
              order: 2,
            },
          ],
        },
      },
    });

    // Запишем демо-студента на курс и отметим первый урок пройденным
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id },
    });
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: firstLesson.id,
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  console.log("✅ Seed выполнен.");
  console.log("   Админ:    admin@platforma.local / password123");
  console.log("   Студент:  student@platforma.local / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
