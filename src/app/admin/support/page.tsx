import { LifeBuoy, Mail, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@/components/admin/ticket-status";
import { Badge } from "@/components/ui/badge";
import { formatMoscowDateTime, plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupportTicketsPage() {
  const [tickets, newCount] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.supportTicket.count({ where: { status: "NEW" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обращения в поддержку</h1>
        <p className="mt-1 text-muted-foreground">
          {newCount > 0
            ? `${newCount} ${plural(newCount, ["новое обращение", "новых обращения", "новых обращений"])}`
            : "Новых обращений нет"}
          . Копия каждого письма уходит на почту поддержки.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Inbox className="mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">Обращений пока нет</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Здесь появятся вопросы, отправленные со страницы «Поддержка».
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="size-4 shrink-0 text-primary" />
                    <h2 className="truncate font-semibold">{t.subject}</h2>
                    {t.status === "NEW" && <Badge variant="warning">новое</Badge>}
                    {t.status === "CLOSED" && <Badge variant="success">закрыто</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.name} ·{" "}
                    <a href={`mailto:${t.email}`} className="text-primary hover:underline">
                      {t.email}
                    </a>
                    {t.user && " · зарегистрирован"}
                    {" · "}
                    {formatMoscowDateTime(t.createdAt)}
                  </p>
                </div>
                <TicketStatus ticketId={t.id} status={t.status} />
              </div>

              <p className="mt-3 whitespace-pre-line rounded-xl bg-muted p-3 text-sm">
                {t.message}
              </p>

              <a
                href={`mailto:${t.email}?subject=${encodeURIComponent("Re: " + t.subject)}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Mail className="size-4" /> Ответить письмом
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
