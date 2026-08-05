/**
 * Создаёт или обновляет администратора из переменных окружения.
 *
 *   ADMIN_EMAIL=you@mail.ru ADMIN_PASSWORD='ваш-пароль' ADMIN_NAME='Имя' \
 *     node scripts/create-admin.mjs
 *
 * Запускается автоматически на каждом деплое (внутри scripts/build.mjs), а
 * также вручную командой `npm run db:admin`.
 *
 * ВАЖНО: пароль синхронизируется при каждом запуске — после деплоя логин и
 * пароль всегда ровно те, что заданы в переменных. Это сделано намеренно:
 * раньше существующему пользователю пароль не менялся, из-за чего новое
 * значение переменной игнорировалось, и вход выдавал «неверные данные».
 * Смены пароля внутри приложения нет, поэтому перезапись ничего не теряет.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Администратор";

if (!email || !password) {
  console.error(
    "create-admin: нужны переменные ADMIN_EMAIL и ADMIN_PASSWORD.\n" +
      "  Пример: ADMIN_EMAIL=you@mail.ru ADMIN_PASSWORD='СложныйПароль' node scripts/create-admin.mjs"
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("create-admin: пароль администратора — минимум 8 символов.");
  process.exit(1);
}

// Диагностика в лог сборки (сам пароль не печатаем — только длину и хвост-маркер).
if (/^\s|\s$/.test(password)) {
  console.warn(
    "create-admin: ВНИМАНИЕ — в пароле есть пробел в начале/конце. " +
      "Проверьте значение переменной ADMIN_PASSWORD в Vercel."
  );
}
console.log(`create-admin: email=${email}, длина пароля=${password.length}`);

const db = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    await db.user.update({
      where: { email },
      data: { role: "ADMIN", passwordHash, name },
    });
    console.log(`create-admin: администратор ${email} обновлён (роль и пароль синхронизированы).`);
  } else {
    await db.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash,
        // Оператор принимает документы фактом создания учётной записи.
        consentAcceptedAt: now,
        termsAcceptedAt: now,
      },
    });
    console.log(`create-admin: администратор ${email} создан.`);
  }
} finally {
  await db.$disconnect();
}
