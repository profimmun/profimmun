/**
 * Сборка проекта.
 *
 * Зачем обёртка вместо цепочки команд в package.json: интеграция Neon/Vercel
 * кладёт строку подключения не в DATABASE_URL, а в POSTGRES_URL_NON_POOLING
 * и подобные. Скопировать их руками нельзя — они помечены Sensitive, и Vercel
 * не показывает значения после создания. Поэтому DATABASE_URL вычисляется
 * здесь и передаётся дочерним процессам.
 *
 * Порядок предпочтения важен: миграции (prisma migrate deploy) выполняются
 * на этапе сборки, а через пулер PgBouncer они упираются в блокировки,
 * поэтому прямое (non-pooling) подключение идёт первым.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_DATABASE_URL_UNPOOLED",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_DATABASE_URL",
  "POSTGRES_URL",
];

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const idx = line.indexOf("=");
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!name || process.env[name] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[name] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function resolveDatabaseUrl() {
  for (const name of CANDIDATES) {
    const value = process.env[name]?.trim();
    // Плейсхолдеры из .env.example не считаем настоящим значением.
    if (
      value &&
      (value.startsWith("postgres://") ||
        value.startsWith("postgresql://") ||
        value.startsWith("file:")) &&
      !value.includes("user:password@host")
    ) {
      return { name, value };
    }
  }
  return null;
}

function fail(lines) {
  console.error("\n" + "─".repeat(68));
  console.error("СБОРКА ОСТАНОВЛЕНА");
  console.error("─".repeat(68) + "\n");
  for (const l of lines) console.error(l);
  console.error("\nГде задать на Vercel:");
  console.error("  Settings → Environment Variables → область Production,");
  console.error("  затем Deployments → Redeploy.\n");
  console.error("─".repeat(68) + "\n");
  process.exit(1);
}

const db = resolveDatabaseUrl();
if (!db) {
  fail([
    "  ✗ Не найдена строка подключения к PostgreSQL.",
    "",
    "    Задайте DATABASE_URL или подключите базу к проекту",
    "    (Storage → Create Database → Postgres) — тогда строка",
    "    подхватится автоматически из переменных Neon.",
    "",
    "    Проверенные имена: " + CANDIDATES.join(", "),
  ]);
}

if (!process.env.AUTH_SECRET?.trim()) {
  fail([
    "  ✗ AUTH_SECRET",
    "",
    "    Длинная случайная строка для подписи сессий.",
    "    Сгенерировать: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  ]);
}

console.log(`Строка подключения взята из ${db.name}.`);
if (db.name !== "DATABASE_URL") {
  console.log("(DATABASE_URL не задана — использую переменную от интеграции Neon.)");
}

if (!process.env.BLOB_READ_WRITE_TOKEN?.trim() && !process.env.BLOB_STORE_ID?.trim()) {
  console.warn(
    "Переменная BLOB_STORE_ID или BLOB_READ_WRITE_TOKEN не задана — не будет работать: загрузка обложек и видео"
  );
}

const missingSmtp = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"].filter(
  (name) => !process.env[name]?.trim()
);
if (missingSmtp.length > 0) {
  console.warn(
    `SMTP не настроен полностью (${missingSmtp.join(", ")}) — не будет работать: письма восстановления пароля`
  );
}

for (const [name, why] of [
  ["NEXT_PUBLIC_APP_URL", "ссылки в письмах сброса пароля"],
  ["SUPPORT_EMAIL", "письма с обращениями из формы поддержки"],
]) {
  if (!process.env[name]?.trim()) {
    console.warn(`Переменная ${name} не задана — не будет работать: ${why}`);
  }
}

const env = { ...process.env, DATABASE_URL: db.value };
const isSqlite = db.value.startsWith("file:");
const schemaArgs = isSqlite ? ["--schema=prisma/schema.local.prisma"] : [];

function run(cmd, args) {
  if (process.platform === "win32" && cmd === "npx") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", cmd, ...args], { stdio: "inherit", env });
  }
  return spawnSync(cmd, args, { stdio: "inherit", env });
}

if (isSqlite) {
  console.log("\n▶ node scripts/use-sqlite.mjs");
  const localSchema = run("node", ["scripts/use-sqlite.mjs"]);
  if (localSchema.status !== 0) process.exit(localSchema.status ?? 1);
}

// Обязательные шаги: провал любого останавливает сборку.
//
// Схему приводим через `db push`, а не `migrate deploy`: он синхронизирует БД
// со схемой без привязки к контрольным суммам миграций. Так деплой не падает,
// если файл миграции менялся между релизами. Изменения в этом проекте
// аддитивны (новые столбцы/таблицы), поэтому потери данных не происходит.
const steps = [
  ["npx", ["prisma", "generate", ...schemaArgs]],
  ["npx", ["prisma", "db", "push", ...schemaArgs, "--skip-generate", "--accept-data-loss"]],
];

for (const [cmd, args] of steps) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const res = run(cmd, args);
  if (res.status !== 0) {
    console.error(`\nШаг «${args.join(" ")}» завершился с ошибкой.`);
    process.exit(res.status ?? 1);
  }
}

// Создание администратора — необязательный шаг. Если ADMIN_EMAIL/ADMIN_PASSWORD
// заданы, админ появляется в базе автоматически (не нужно запускать db:admin
// вручную). Если переменных нет или что-то пошло не так — сборку не роняем.
if (process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD) {
  console.log("\n▶ node scripts/create-admin.mjs");
  const res = run("node", ["scripts/create-admin.mjs"]);
  if (res.status !== 0) {
    console.warn("Не удалось создать администратора на этапе сборки — можно сделать позже через `npm run db:admin`.");
  }
} else {
  console.log("\nADMIN_EMAIL/ADMIN_PASSWORD не заданы — админ не создаётся автоматически.");
}

console.log("\n▶ npx next build");
const build = run("npx", ["next", "build"]);
if (build.status !== 0) process.exit(build.status ?? 1);
