"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setTicketStatus } from "@/lib/support-actions";
import { Dropdown } from "@/components/ui/dropdown";

export function TicketStatus({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(status);
  const [pending, start] = React.useTransition();

  return (
    <Dropdown
      ariaLabel="Статус обращения"
      value={value}
      disabled={pending}
      className="w-44"
      options={[
        { value: "NEW", label: "Новое", description: "Ещё не в работе" },
        { value: "IN_PROGRESS", label: "В работе", description: "Разбираемся" },
        { value: "CLOSED", label: "Закрыто", description: "Ответ отправлен" },
      ]}
      onChange={(next) => {
        setValue(next);
        start(async () => {
          await setTicketStatus(ticketId, next);
          router.refresh();
        });
      }}
    />
  );
}
