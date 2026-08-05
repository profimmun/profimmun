// Строковые «перечисления» (в SQLite хранятся как String).
export type Role = "ADMIN" | "STUDENT";
export type VideoType = "NONE" | "YOUTUBE" | "VIMEO" | "UPLOAD";
export type QuestionType = "SINGLE" | "MULTIPLE" | "OPEN";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";
