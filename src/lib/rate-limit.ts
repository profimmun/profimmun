import "server-only";
import { headers } from "next/headers";

/**
 * Ограничитель частоты запросов (скользящее окно) для защиты от подбора
 * паролей и рассылки писем сброса.
 *
 * Хранилище — в памяти процесса. Этого достаточно для одного инстанса
 * (текущая конфигурация: один Node-процесс + SQLite). Ограничения, о которых
 * нужно помнить при масштабировании:
 *   • счётчики обнуляются при перезапуске сервера;
 *   • при нескольких инстансах у каждого будет свой счётчик.
 * Для продакшена с несколькими репликами вынесите хранилище в Redis,
 * сохранив сигнатуры hit()/reset().
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Чтобы карта не росла бесконечно, изредка подчищаем истёкшие записи.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/** Регистрирует попытку. Возвращает ok=false, если лимит исчерпан. */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Сбрасывает счётчик — вызывайте после успешного входа. */
export function reset(key: string): void {
  buckets.delete(key);
}

/** IP клиента из заголовков прокси; "unknown" при прямом подключении. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Человекочитаемое время ожидания. */
export function formatRetryAfter(sec: number): string {
  if (sec < 60) return `${sec} сек.`;
  const min = Math.ceil(sec / 60);
  return `${min} мин.`;
}
