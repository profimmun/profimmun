import "server-only";
import nodemailer from "nodemailer";
import { formatMoscowDateTime } from "./utils";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Адрес для ответа — используется в письмах поддержки. */
  replyTo?: string;
};

const SMTP_REQUIRED = [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

export function missingSmtpVars(): string[] {
  return SMTP_REQUIRED.filter((name) => !process.env[name]?.trim());
}

export function isSmtpConfigured(): boolean {
  return missingSmtpVars().length === 0;
}

const transporter = isSmtpConfigured()
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

export async function verifyMailTransport(): Promise<void> {
  if (!transporter) {
    throw new Error(`SMTP is not configured. Missing: ${missingSmtpVars().join(", ")}`);
  }

  await transporter.verify();
}

/**
 * Отправляет письмо. Если SMTP не сконфигурирован — печатает содержимое
 * в консоль сервера (удобно для локальной разработки).
 */
export async function sendMail({ to, subject, html, text, replyTo }: MailInput) {
  const from = process.env.SMTP_FROM ?? "Платформа <no-reply@platforma.local>";

  if (!transporter) {
    const missing = missingSmtpVars().join(", ");
    if (process.env.NODE_ENV === "production") {
      throw new Error(`SMTP is not configured. Missing: ${missing}`);
    }

    console.log("\n📧 [DEV EMAIL] SMTP не настроен, письмо в консоль:");
    console.log(`   Не заданы: ${missing}`);
    console.log(`   Кому: ${to}`);
    if (replyTo) console.log(`   Ответить: ${replyTo}`);
    console.log(`   Тема: ${subject}`);
    console.log(`   ${text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return;
  }

  await transporter.sendMail({ from, to, subject, html, text, replyTo });
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

/** Письмо администратору с обращением из формы поддержки. */
export function supportTicketEmail(t: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date | string;
}) {
  const sentAt = formatMoscowDateTime(t.createdAt);

  return {
    subject: `Поддержка: ${t.subject}`,
    text: `Обращение №${t.id}\nОтправлено: ${sentAt}\nОт: ${t.name} <${t.email}>\nТема: ${t.subject}\n\n${t.message}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5;margin:0 0 4px">Новое обращение в поддержку</h2>
        <p style="color:#666;font-size:13px;margin:0 0 20px">Обращение №${escapeHtml(t.id)}</p>
        <p><strong>Отправлено:</strong> ${escapeHtml(sentAt)}</p>
        <p><strong>От:</strong> ${escapeHtml(t.name)} &lt;${escapeHtml(t.email)}&gt;</p>
        <p><strong>Тема:</strong> ${escapeHtml(t.subject)}</p>
        <div style="margin-top:16px;padding:14px;background:#f5f5fa;border-radius:10px;white-space:pre-line">${escapeHtml(t.message)}</div>
        <p style="color:#666;font-size:13px;margin-top:20px">
          Ответьте прямо на это письмо — оно уйдёт на ${escapeHtml(t.email)}.
        </p>
      </div>
    `,
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Восстановление пароля — Платформа",
    text: `Для сброса пароля перейдите по ссылке: ${resetUrl} (ссылка действует 1 час).`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Восстановление пароля</h2>
        <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы задать новый пароль.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}"
             style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block">
            Сбросить пароль
          </a>
        </p>
        <p style="color:#666;font-size:13px">Ссылка действует 1 час. Если вы не запрашивали сброс — просто проигнорируйте письмо.</p>
      </div>
    `,
  };
}
