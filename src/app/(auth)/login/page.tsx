import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>С возвращением</CardTitle>
        <CardDescription>Войдите в аккаунт, чтобы продолжить обучение</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reset && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Пароль обновлён. Войдите с новым паролем.
          </div>
        )}
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
