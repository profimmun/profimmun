import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Новый пароль" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ссылка недействительна</CardTitle>
          <CardDescription>Отсутствует токен восстановления.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Запросить новую ссылку
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новый пароль</CardTitle>
        <CardDescription>Придумайте новый пароль для входа</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetForm token={token} />
      </CardContent>
    </Card>
  );
}
