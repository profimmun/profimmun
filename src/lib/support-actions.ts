"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { requireRole } from "./auth";
import { supportSchema } from "./validations";
import { sendMail, supportTicketEmail } from "./mail";
import { hit, clientIp, formatRetryAfter } from "./rate-limit";
import { legal, NOT_SET } from "./legal";

export type SupportState = { error?: string; success?: string } | null;

/** Куда уходят обращения: переменная окружения, иначе почта из реквизитов. */
function supportRecipient(): string | null {
  const fromEnv = process.env.SUPPORT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  if (legal.supportEmail && legal.supportEmail !== NOT_SET) return legal.supportEmail;
  return null;
}

export async function submitSupportTicket(
  _prev: SupportState,
  formData: FormData
): Promise<SupportState> {
  const parsed = supportSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте заполнение формы" };
  }

  // Защита от спама: форма открыта всем, включая неавторизованных.
  const ip = await clientIp();
  const gate = hit(`support:${ip}`, 5, 60 * 60_000);
  if (!gate.ok) {
    return {
      error: `Слишком много обращений. Повторите через ${formatRetryAfter(gate.retryAfterSec)}`,
    };
  }

  const user = await getCurrentUser();
  const { name, email, subject, message } = parsed.data;

  // Сначала сохраняем в БД: даже если почта не настроена или упадёт,
  // обращение не потеряется и будет видно в админке.
  const ticket = await prisma.supportTicket.create({
    data: { name, email, subject, message, userId: user?.id ?? null },
  });

  const to = supportRecipient();
  if (to) {
    try {
      const mail = supportTicketEmail({ id: ticket.id, name, email, subject, message });
      await sendMail({ to, ...mail, replyTo: email });
    } catch (e) {
      // Письмо не ушло — обращение уже сохранено, поэтому пользователю
      // показываем успех, а причину пишем в лог сервера.
      console.error("Не удалось отправить письмо поддержки:", e);
    }
  } else {
    console.warn(
      "SUPPORT_EMAIL не задан и почта в src/lib/legal.ts не заполнена — " +
        "обращение сохранено только в базе."
    );
  }

  revalidatePath("/admin/support");
  return {
    success:
      "Обращение отправлено. Мы ответим на указанный email в ближайшее время.",
  };
}

/** Смена статуса обращения в админке. */
export async function setTicketStatus(ticketId: string, status: string) {
  await requireRole("ADMIN");
  if (!["NEW", "IN_PROGRESS", "CLOSED"].includes(status)) return;
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath("/admin/support");
}
