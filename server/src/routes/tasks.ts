import { Router } from "express";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../lib/http.js";
import { createTaskSchema, parseBody, updateTaskSchema } from "../schemas/index.js";
import { requireAuth } from "../middleware/auth.js";
import { getMembership, isAdmin } from "../lib/rbac.js";
import { logActivity } from "../lib/activity.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const taskInclude = {
  assignee: { select: { id: true, email: true, name: true } },
  createdBy: { select: { id: true, email: true, name: true } },
  _count: { select: { comments: true } },
} as const;

async function assertAssigneeInProject(assigneeId: string | null | undefined, projectId: string) {
  if (assigneeId === undefined || assigneeId === null) return;
  const m = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: assigneeId, projectId } },
  });
  if (!m) throw new Error("ASSIGNEE_NOT_MEMBER");
}

tasksRouter.get("/projects/:projectId/tasks", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const where: Prisma.TaskWhereInput = { projectId };

  const status = req.query.status as TaskStatus | undefined;
  if (status && ["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
    where.status = status;
  }

  const priority = req.query.priority as TaskPriority | undefined;
  if (priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
    where.priority = priority;
  }

  const assigneeId = req.query.assigneeId as string | undefined;
  if (assigneeId === "me") {
    where.assigneeId = userId;
  } else if (assigneeId === "unassigned") {
    where.assigneeId = null;
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return res.json({ tasks });
});

tasksRouter.post("/projects/:projectId/tasks", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;
  const parsed = parseBody(createTaskSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.archivedAt) return badRequest(res, "Cannot add tasks to an archived project");

  try {
    await assertAssigneeInProject(parsed.data.assigneeId ?? null, projectId);
  } catch (e) {
    if (e instanceof Error && e.message === "ASSIGNEE_NOT_MEMBER") {
      return badRequest(res, "Assignee must be a project member");
    }
    throw e;
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      status: parsed.data.status ?? "TODO",
      priority: parsed.data.priority ?? "MEDIUM",
      assigneeId: parsed.data.assigneeId ?? null,
      dueDate: parsed.data.dueDate ?? null,
      createdById: userId,
    },
    include: taskInclude,
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "TASK_CREATED",
    entityType: "task",
    entityId: task.id,
    meta: { title: task.title, priority: task.priority },
  });

  return res.status(201).json({ task });
});

tasksRouter.patch("/tasks/:taskId", async (req, res) => {
  const userId = req.authUser!.id;
  const { taskId } = req.params;
  const parsed = parseBody(updateTaskSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return notFound(res, "Task not found");

  const membership = await getMembership(userId, existing.projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const admin = isAdmin(membership.role);
  const canEdit = admin || existing.assigneeId === userId || existing.createdById === userId;

  if (!canEdit) {
    return forbidden(res, "You can only edit tasks you created or are assigned to");
  }

  if (!admin && (parsed.data.assigneeId !== undefined || parsed.data.title !== undefined)) {
    if (existing.createdById !== userId && parsed.data.title !== undefined) {
      return forbidden(res, "Only the creator or an admin can change the title");
    }
    if (parsed.data.assigneeId !== undefined) {
      return forbidden(res, "Only an admin can reassign tasks");
    }
  }

  try {
    if (parsed.data.assigneeId !== undefined) {
      await assertAssigneeInProject(parsed.data.assigneeId, existing.projectId);
    }
  } catch (e) {
    if (e instanceof Error && e.message === "ASSIGNEE_NOT_MEMBER") {
      return badRequest(res, "Assignee must be a project member");
    }
    throw e;
  }

  const data: Prisma.TaskUpdateInput = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.assigneeId !== undefined) {
    data.assignee = parsed.data.assigneeId
      ? { connect: { id: parsed.data.assigneeId } }
      : { disconnect: true };
  }
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate;

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  await logActivity({
    projectId: existing.projectId,
    actorId: userId,
    action: "TASK_UPDATED",
    entityType: "task",
    entityId: taskId,
    meta: { title: task.title, status: task.status, priority: task.priority },
  });

  return res.json({ task });
});

tasksRouter.delete("/tasks/:taskId", async (req, res) => {
  const userId = req.authUser!.id;
  const { taskId } = req.params;

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return notFound(res, "Task not found");

  const membership = await getMembership(userId, existing.projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) {
    return forbidden(res, "Only admins can delete tasks");
  }

  await prisma.task.delete({ where: { id: taskId } });

  await logActivity({
    projectId: existing.projectId,
    actorId: userId,
    action: "TASK_DELETED",
    entityType: "task",
    entityId: taskId,
    meta: { title: existing.title },
  });

  return res.status(204).send();
});
