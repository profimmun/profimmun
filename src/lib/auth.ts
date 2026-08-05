import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import type { Role } from "./types";

const SESSION_COOKIE = "platforma_session";
const SESSION_TTL_DAYS = 30;

export type SafeUser = Omit<User, "passwordHash" | "role"> & { role: Role };

function stripUser(user: User): SafeUser {
  const safe = Object.fromEntries(
    Object.entries(user).filter(([key]) => key !== "passwordHash")
  ) as Omit<User, "passwordHash">;
  return { ...safe, role: safe.role as Role };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Создаёт сессию и ставит httpOnly cookie.
 *
 * В БД хранится только SHA-256 от токена: утечка базы (а это обычный файл
 * SQLite) не должна позволять угнать активные сессии. «Сырой» токен живёт
 * исключительно в cookie пользователя.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5);

  await prisma.session.create({
    data: { token: sha256(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Удаляет текущую сессию и очищает cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: sha256(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Возвращает текущего пользователя по сессии из cookie либо null. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: sha256(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return stripUser(session.user);
}

/** Требует авторизацию; при её отсутствии — исключение (используйте в защищённых экшенах). */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(role: Role): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== role) throw new Error("FORBIDDEN");
  return user;
}

/** Создаёт токен сброса пароля, возвращает «сырой» токен для ссылки. */
export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

  // аннулируем прежние неиспользованные токены
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

/** Проверяет и «погашает» токен сброса, возвращает userId или null. */
export async function consumePasswordResetToken(
  token: string
): Promise<string | null> {
  const tokenHash = sha256(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}
