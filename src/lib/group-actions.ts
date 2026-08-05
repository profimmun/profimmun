"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireRole } from "./auth";

async function ensureAdmin() {
  return requireRole("ADMIN");
}

export async function createGroup(_prev: unknown, formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) return { error: "Название группы — минимум 2 символа" };

  const exists = await prisma.group.findUnique({ where: { name } });
  if (exists) return { error: "Группа с таким названием уже есть" };

  const group = await prisma.group.create({ data: { name, description } });
  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function updateGroup(groupId: string, formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) return { error: "Название группы — минимум 2 символа" };

  const clash = await prisma.group.findFirst({
    where: { name, id: { not: groupId } },
    select: { id: true },
  });
  if (clash) return { error: "Группа с таким названием уже есть" };

  await prisma.group.update({ where: { id: groupId }, data: { name, description } });
  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return { success: "Сохранено" };
}

export async function deleteGroup(groupId: string) {
  await ensureAdmin();
  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}

/** Добавляет/убирает студента в группе. */
export async function toggleGroupMember(
  groupId: string,
  userId: string,
  member: boolean
) {
  await ensureAdmin();
  await prisma.group.update({
    where: { id: groupId },
    data: {
      members: member ? { connect: { id: userId } } : { disconnect: { id: userId } },
    },
  });
  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath("/admin/students");
}

/** Открывает/закрывает группе доступ к курсу. */
export async function toggleGroupCourse(
  groupId: string,
  courseId: string,
  allowed: boolean
) {
  await ensureAdmin();
  await prisma.group.update({
    where: { id: groupId },
    data: {
      courses: allowed ? { connect: { id: courseId } } : { disconnect: { id: courseId } },
    },
  });
  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath("/admin/courses");
}

/** Массово задаёт группы конкретного студента (со страницы «Студенты»). */
export async function setUserGroups(userId: string, groupIds: string[]) {
  await ensureAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { groups: { set: groupIds.map((id) => ({ id })) } },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/groups");
}
