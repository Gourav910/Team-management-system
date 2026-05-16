import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../lib/http.js";
import { createCommentSchema, parseBody } from "../schemas/index.js";
import { requireAuth } from "../middleware/auth.js";
import { getMembership } from "../lib/rbac.js";
import { logActivity } from "../lib/activity.js";

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

const authorSelect = { id: true, name: true, email: true } as const;

commentsRouter.get("/tasks/:taskId/comments", async (req, res) => {
  const userId = req.authUser!.id;
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return notFound(res, "Task not found");

  const membership = await getMembership(userId, task.projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: "asc" },
  });

  return res.json({ comments });
});

commentsRouter.post("/tasks/:taskId/comments", async (req, res) => {
  const userId = req.authUser!.id;
  const { taskId } = req.params;
  const parsed = parseBody(createCommentSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return notFound(res, "Task not found");

  const membership = await getMembership(userId, task.projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: userId,
      body: parsed.data.body,
    },
    include: { author: { select: authorSelect } },
  });

  await logActivity({
    projectId: task.projectId,
    actorId: userId,
    action: "COMMENT_ADDED",
    entityType: "task",
    entityId: taskId,
    meta: { taskTitle: task.title },
  });

  return res.status(201).json({ comment });
});

commentsRouter.delete("/comments/:commentId", async (req, res) => {
  const userId = req.authUser!.id;
  const { commentId } = req.params;

  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: { task: true },
  });
  if (!comment) return notFound(res, "Comment not found");

  const membership = await getMembership(userId, comment.task.projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (comment.authorId !== userId && membership.role !== "ADMIN") {
    return forbidden(res, "Only the author or an admin can delete this comment");
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  return res.status(204).send();
});
