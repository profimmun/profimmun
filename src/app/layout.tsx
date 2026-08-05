import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/legal/cookie-notice";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Платформа — онлайн-школа",
    template: "%s — Платформа",
  },
  description:
    "Современная платформа онлайн-обучения: курсы, уроки, видео и тесты.",
};

// Ставит .dark до гидратации, чтобы не было мигания темы
const themeScript = `
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${unbounded.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Первым делом в body: тема применяется до отрисовки контента,
            поэтому нет вспышки светлой темы. В <head> React ругается на
            script внутри компонента. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
