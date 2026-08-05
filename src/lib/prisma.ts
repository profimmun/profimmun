import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const resolved = resolveDatabaseUrl();

if (!resolved) {
  // Понятная ошибка вместо невнятного падения на первом же запросе.
  throw new Error(
    "Не найдена строка подключения к базе. Задайте DATABASE_URL " +
      "или подключите базу к проекту (Storage → Postgres) — тогда строка " +
      "возьмётся из переменных интеграции Neon."
  );
}

// В логах деплоя видно, откуда взято подключение — экономит время при разборе.
if (resolved.source !== "DATABASE_URL") {
  console.log(`[prisma] строка подключения взята из ${resolved.source}`);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Передаём URL явно: на Vercel переменная может называться иначе,
    // а Prisma по умолчанию читает только DATABASE_URL.
    datasources: { db: { url: resolved.url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
