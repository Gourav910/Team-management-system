import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/http.js";
import { changePasswordSchema, parseBody, updateProfileSchema } from "../schemas/index.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();
meRouter.use(requireAuth);

const userSelect = {
  id: true,
  email: true,
  name: true,
  emailOnAssign: true,
  emailOnDueSoon: true,
  createdAt: true,
} as const;

meRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUser!.id },
    select: userSelect,
  });
  return res.json({ user });
});

meRouter.patch("/", async (req, res) => {
  const parsed = parseBody(updateProfileSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.emailOnAssign !== undefined) data.emailOnAssign = parsed.data.emailOnAssign;
  if (parsed.data.emailOnDueSoon !== undefined) data.emailOnDueSoon = parsed.data.emailOnDueSoon;

  const user = await prisma.user.update({
    where: { id: req.authUser!.id },
    data,
    select: userSelect,
  });
  return res.json({ user });
});

meRouter.patch("/password", async (req, res) => {
  const parsed = parseBody(changePasswordSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user) return badRequest(res, "User not found");

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return badRequest(res, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return res.json({ ok: true });
});
