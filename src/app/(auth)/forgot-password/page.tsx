import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default function ForgotPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Забыли пароль?</CardTitle>
        <CardDescription>
          Введите email — пришлём ссылку для восстановления доступа
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotForm />
        <p className="text-center text-sm text-muted-foreground">
          Вспомнили?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
