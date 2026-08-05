"use server";

import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "./auth";
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
} from "./validations";
import {
  sendMail,
  passwordResetEmail,
  isSmtpConfigured,
  verifyMailTransport,
} from "./mail";
import { hit, reset, clientIp, formatRetryAfter } from "./rate-limit";
import { syncEnrollments } from "./access";
import { appUrl } from "./app-url";
import { legal } from "./legal";

export type FormState = { error?: string; success?: string } | null;

/** Лимиты на чувствительные действия. */
const LIMITS = {
  login: { limit: 5, windowMs: 15 * 60_000 }, // 5 попыток / 15 мин
  register: { limit: 5, windowMs: 60 * 60_000 }, // 5 регистраций / час с IP
  forgot: { limit: 3, windowMs: 60 * 60_000 }, // 3 письма / час
  reset: { limit: 10, windowMs: 60 * 60_000 }, // 10 попыток подбора токена / час
} as const;

export async function registerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent") === "on",
    terms: formData.get("terms") === "on",
    marketing: formData.get("marketing") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const ip = await clientIp();
  const gate = hit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowMs);
  if (!gate.ok) {
    return {
      error: `Слишком много регистраций. Попробуйте через ${formatRetryAfter(gate.retryAfterSec)}`,
    };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует" };
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "STUDENT",
      // Фиксируем факт, момент и редакцию принятых документов — это и есть
      // подтверждение согласия по 152-ФЗ.
      consentAcceptedAt: now,
      consentVersion: legal.consentVersion,
      termsAcceptedAt: now,
      termsVersion: legal.termsVersion,
      marketingAcceptedAt: parsed.data.marketing ? now : null,
    },
  });
  // Сразу открываем все доступные курсы: ждать администратора не нужно.
  await syncEnrollments(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const { email, password } = parsed.data;

  // Ключ по IP + email: не даём перебирать пароль к конкретному аккаунту
  // и одновременно ограничиваем поток попыток с одного адреса.
  const ip = await clientIp();
  const key = `login:${ip}:${email}`;
  const gate = hit(key, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!gate.ok) {
    return {
      error: `Слишком много попыток входа. Повторите через ${formatRetryAfter(gate.retryAfterSec)}`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Неверный email или пароль" };
  }

  reset(key); // успешный вход обнуляет счётчик
  // Подхватываем курсы, добавленные с прошлого входа.
  if (user.role === "STUDENT") await syncEnrollments(user.id);
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте email" };
  }

  // Ограничиваем рассылку писем: и защита от подбора, и от «бомбёжки» ящика.
  // Ответ при превышении — тот же нейтральный текст, чтобы по нему нельзя
  // было судить о существовании аккаунта.
  const ip = await clientIp();
  const gate = hit(
    `forgot:${ip}:${parsed.data.email}`,
    LIMITS.forgot.limit,
    LIMITS.forgot.windowMs
  );

  const neutral = {
    success:
      "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для сброса пароля.",
  };
  if (!gate.ok) return neutral;

  if (!isSmtpConfigured()) {
    console.error("Password reset email is unavailable: SMTP is not configured.");
    return {
      error:
        "Отправка писем временно не настроена. Напишите в поддержку, чтобы восстановить доступ.",
    };
  }

  try {
    await verifyMailTransport();
  } catch (error) {
    console.error("Password reset email is unavailable: SMTP verification failed.", error);
    return {
      error:
        "Отправка писем временно недоступна. Проверьте SMTP-настройки или напишите в поддержку.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Не раскрываем существование аккаунта — всегда одинаковый ответ
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const base = appUrl();
    const resetUrl = `${base}/reset-password?token=${token}`;
    const mail = passwordResetEmail(resetUrl);
    await sendMail({ to: user.email, ...mail }).catch((error) => {
      console.error("Password reset email failed:", error);
    });
  }

  return neutral;
}

export async function resetAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  // Токен 256-битный, но лимит закрывает и теоретический перебор.
  const ip = await clientIp();
  const gate = hit(`reset:${ip}`, LIMITS.reset.limit, LIMITS.reset.windowMs);
  if (!gate.ok) {
    return {
      error: `Слишком много попыток. Повторите через ${formatRetryAfter(gate.retryAfterSec)}`,
    };
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return { error: "Ссылка недействительна или истёк срок её действия" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  // Завершаем все активные сессии пользователя ради безопасности
  await prisma.session.deleteMany({ where: { userId } });

  redirect("/login?reset=1");
}
