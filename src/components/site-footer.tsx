import Link from "next/link";
import { Brand } from "./brand";
import { legal, NOT_SET } from "@/lib/legal";

const links = [
  { href: "/legal/privacy", label: "Политика обработки данных" },
  { href: "/legal/terms", label: "Пользовательское соглашение" },
  { href: "/legal/consent", label: "Согласие на обработку" },
  { href: "/support", label: "Поддержка" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Brand href="/dashboard" />

          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p>
            © {new Date().getFullYear()}{" "}
            {legal.operatorName !== NOT_SET ? legal.operatorName : legal.brandName}
          </p>
          {legal.inn !== NOT_SET && <p className="mt-0.5">ИНН {legal.inn}</p>}
        </div>
      </div>
    </footer>
  );
}
