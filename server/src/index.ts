import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { meRouter } from "./routes/me.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { commentsRouter } from "./routes/comments.js";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
 app.use("/api/me", meRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/projects", projectsRouter);
app.use("/api", tasksRouter);
app.use("/api", commentsRouter);

const publicDir = path.join(__dirname, "..", "public");
if (isProd && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path === "/health") return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(req.method, req.path, err);
  const body: { error: string; detail?: string; code?: string } = { error: "Internal server error" };
  if (!isProd && err instanceof Error) {
    body.detail = err.message;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    body.code = String((err as { code: unknown }).code);
  }
  return res.status(500).json(body);
});

try {
  await prisma.$connect();
} catch (e) {
  console.error("Database connection failed. Set DATABASE_URL (PostgreSQL) and run: npx prisma migrate deploy");
  console.error(e);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT} (${isProd ? "production" : "development"})`);
});
