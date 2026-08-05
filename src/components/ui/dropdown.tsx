"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/lib/client-state";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Доступный выпадающий список взамен нативного <select>.
 * Меню рендерится в портал с position: fixed, чтобы его не обрезали
 * контейнеры с overflow (например, прокручиваемые таблицы).
 */
export function Dropdown({
  value,
  onChange,
  options,
  disabled,
  className,
  placeholder = "Выберите",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const mounted = useClientMounted();

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const position = React.useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  function openMenu() {
    if (disabled) return;
    position();
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  // Закрытие по клику вне, Esc, прокрутке и ресайзу
  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onScrollOrResize() {
      position();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, position]);

  function commit(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const menu =
    open && rect && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              top: rect.bottom + 6,
              left: rect.left,
              minWidth: rect.width,
              zIndex: 60,
            }}
            className="max-h-64 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg shadow-black/5 animate-fade-in-up"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(i)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-2 ring-ring",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {menu}
    </>
  );
}
