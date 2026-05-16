import { z } from "zod";
import { ProjectRole, TaskPriority, TaskStatus } from "@prisma/client";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  emailOnAssign: z.boolean().optional(),
  emailOnDueSoon: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code like #5b8cff");

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  color: hexColor.optional().default("#5b8cff"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  color: hexColor.optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(ProjectRole),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(8000).optional().default(""),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(8000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { ok: false, error: msg };
  }
  return { ok: true, data: result.data };
}
