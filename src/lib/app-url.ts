import "server-only";

/**
 * Базовый адрес приложения для ссылок в письмах.
 *
 * Порядок: явно заданный NEXT_PUBLIC_APP_URL → домен, который Vercel
 * подставляет автоматически → локальная разработка.
 *
 * VERCEL_URL приходит без схемы и указывает на конкретный деплой. Для
 * продакшена лучше задать NEXT_PUBLIC_APP_URL со своим доменом, иначе ссылка
 * в письме будет вести на превью-версию.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
