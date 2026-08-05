"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { setUserGroups } from "@/lib/group-actions";
import { Badge } from "@/components/ui/badge";
import { useClientMounted } from "@/lib/client-state";
import { cn } from "@/lib/utils";

type GroupOption = { id: string; name: string };

export function UserGroupsCell({
  userId,
  allGroups,
  groupIds,
}: {
  userId: string;
  allGroups: GroupOption[];
  groupIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useOptimistic(
    groupIds,
    (_current, next: string[]) => next
  );
  const [open, setOpen] = React.useState(false);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const mounted = useClientMounted();
  const [pending, start] = React.useTransition();

  const btnRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((g) => g !== id)
      : [...selected, id];
    start(async () => {
      setSelected(next);
      await setUserGroups(userId, next);
      router.refresh();
    });
  }

  const names = allGroups.filter((g) => selected.includes(g.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {names.map((g) => (
        <Badge key={g.id} variant="default">
          {g.name}
        </Badge>
      ))}
      {names.length === 0 && (
        <span className="text-xs text-muted-foreground">без группы</span>
      )}

      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Изменить группы"
        disabled={allGroups.length === 0}
        onClick={() => {
          if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
      </button>

      {open &&
        rect &&
        mounted &&
        createPortal(
          <div
            ref={popRef}
            role="menu"
            style={{
              position: "fixed",
              top: rect.bottom + 6,
              left: Math.max(8, rect.left - 120),
              zIndex: 60,
              width: 240,
            }}
            className="max-h-64 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg animate-fade-in-up"
          >
            {allGroups.map((g) => {
              const on = selected.includes(g.id);
              return (
                <button
                  key={g.id}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  onClick={() => toggle(g.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <span className="truncate">{g.name}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
