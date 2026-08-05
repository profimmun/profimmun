/**
 * Поиск строки подключения к базе.
 *
 * Интеграция Neon/Vercel создаёт POSTGRES_URL_NON_POOLING и подобные
 * переменные вместо DATABASE_URL, который читает Prisma. Значения помечены
 * Sensitive, поэтому скопировать их в DATABASE_URL вручную нельзя.
 *
 * Тот же список используется в scripts/build.mjs — при изменении правьте оба
 * места (сборочный скрипт не может импортировать TypeScript).
 */

const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_DATABASE_URL_UNPOOLED",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_DATABASE_URL",
  "POSTGRES_URL",
] as const;

/** Похоже ли значение на настоящую строку подключения, а не на заглушку. */
function usable(value: string | undefined): value is string {
  if (!value) return false;
  const v = value.trim();
  return (
    (v.startsWith("postgres://") || v.startsWith("postgresql://") || v.startsWith("file:")) &&
    !v.includes("user:password@host")
  );
}

/** Возвращает строку подключения и имя переменной, из которой она взята. */
export function resolveDatabaseUrl(): { url: string; source: string } | null {
  for (const name of CANDIDATES) {
    const value = process.env[name];
    if (usable(value)) return { url: value.trim(), source: name };
  }
  return null;
}
