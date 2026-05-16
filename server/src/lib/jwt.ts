import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./env.js";

export type JwtPayload = { sub: string; email: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const sub = (decoded as jwt.JwtPayload & { sub?: string }).sub;
  const email = (decoded as jwt.JwtPayload & { email?: string }).email;
  if (!sub || !email) throw new Error("Invalid token");
  return { sub, email };
}
