import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя минимум 2 символа").max(80),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(6, "Пароль минимум 6 символов").max(100),
  // Согласия проверяются и на сервере: галочку в браузере легко обойти,
  // а по 152-ФЗ факт согласия должен быть подтверждаемым.
  consent: z.literal(true, {
    message: "Без согласия на обработку персональных данных регистрация невозможна",
  }),
  terms: z.literal(true, {
    message: "Примите пользовательское соглашение",
  }),
  marketing: z.boolean().optional(),
});

export const supportSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(80),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  subject: z.string().trim().min(3, "Кратко опишите тему").max(150),
  message: z.string().trim().min(10, "Опишите вопрос подробнее (от 10 символов)").max(5000),
  consent: z.literal(true, {
    message: "Нужно согласие на обработку персональных данных",
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный email"),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6, "Пароль минимум 6 символов").max(100),
});

export const courseSchema = z.object({
  title: z.string().trim().min(2, "Название минимум 2 символа").max(140),
  description: z.string().trim().max(4000).optional().default(""),
  coverImage: z.string().trim().optional().default(""),
  published: z.boolean().optional().default(false),
});

export const moduleSchema = z.object({
  title: z.string().trim().min(1, "Введите название модуля").max(140),
});

export const lessonSchema = z.object({
  title: z.string().trim().min(1, "Введите название урока").max(180),
  content: z.string().max(50000).optional().default(""),
  videoType: z.enum(["NONE", "YOUTUBE", "VIMEO", "UPLOAD"]).default("NONE"),
  videoUrl: z.string().trim().optional().default(""),
  published: z.boolean().optional().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
