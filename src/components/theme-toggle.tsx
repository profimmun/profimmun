"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { notifyDocumentClassChange, useDocumentClass } from "@/lib/client-state";

export function ThemeToggle() {
  const dark = useDocumentClass("dark");

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    notifyDocumentClassChange("dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
