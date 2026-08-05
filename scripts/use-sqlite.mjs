/**
 * Готовит локальную схему на SQLite из основной (PostgreSQL).
 *
 * Зачем: на Vercel нужен PostgreSQL, а локально удобно работать без сервера
 * и без интернета. Вместо второй схемы, которую пришлось бы синхронизировать
 * руками, она генерируется из prisma/schema.prisma заменой одной строки —
 * поэтому модели никогда не разъедутся.
 *
 * Файл prisma/schema.local.prisma в git не попадает (он в .gitignore).
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "prisma/schema.prisma";
const OUT = "prisma/schema.local.prisma";

const schema = readFileSync(SRC, "utf8");

if (!/provider\s*=\s*"postgresql"/.test(schema)) {
  console.error(
    `Не нашёл provider = "postgresql" в ${SRC}. Схема изменилась — поправьте скрипт.`
  );
  process.exit(1);
}

const local =
  "// СГЕНЕРИРОВАНО scripts/use-sqlite.mjs — не редактируйте вручную.\n" +
  "// Правьте prisma/schema.prisma и запускайте `npm run local:setup`.\n\n" +
  schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

writeFileSync(OUT, local);
console.log(`Локальная схема готова: ${OUT} (SQLite)`);
