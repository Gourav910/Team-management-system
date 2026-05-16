import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/http.js";

export type AuthUser = { id: string; email: string; name: string };

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return unauthorized(res, "Missing or invalid Authorization header");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const { sub, email } = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true },
    });
    if (!user || user.email !== email) {
      return unauthorized(res, "Invalid session");
    }
    req.authUser = user;
    return next();
  } catch {
    return unauthorized(res, "Invalid or expired token");
  }
}
