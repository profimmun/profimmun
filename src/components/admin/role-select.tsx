"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setUserRole } from "@/lib/admin-actions";
import { Dropdown } from "@/components/ui/dropdown";
import type { Role } from "@/lib/types";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState<Role>(role);
  const [pending, start] = React.useTransition();

  return (
    <Dropdown
      ariaLabel="Роль пользователя"
      value={value}
      disabled={disabled || pending}
      className="w-44"
      options={[
        { value: "STUDENT", label: "Студент", description: "Доступ к курсам" },
        { value: "ADMIN", label: "Администратор", description: "Полный доступ" },
      ]}
      onChange={(next) => {
        setValue(next as Role);
        start(async () => {
          await setUserRole(userId, next as Role);
          router.refresh();
        });
      }}
    />
  );
}
