import type { Response } from "express";

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

export function unauthorized(res: Response, message = "Unauthorized") {
  return res.status(401).json({ error: message });
}

export function forbidden(res: Response, message = "Forbidden") {
  return res.status(403).json({ error: message });
}

export function notFound(res: Response, message = "Not found") {
  return res.status(404).json({ error: message });
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ error: message });
}
