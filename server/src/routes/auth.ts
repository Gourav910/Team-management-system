import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { parseBody, registerSchema, loginSchema } from "../schemas/index.js";
import { badRequest, conflict } from "../lib/http.js";
import { signToken } from "../lib/jwt.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = parseBody(registerSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return conflict(res, "Email already registered");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
    },
    select: { id: true, email: true, name: true },
  });

  const token = signToken({ sub: user.id, email: user.email });
  return res.status(201).json({ token, user });
});

authRouter.post("/login", async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return badRequest(res, "Invalid email or password");

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return badRequest(res, "Invalid email or password");

  const token = signToken({ sub: user.id, email: user.email });
  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});
