import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound, conflict } from "../lib/http.js";
import {
  addMemberSchema,
  createProjectSchema,
  parseBody,
  updateMemberRoleSchema,
  updateProjectSchema,
} from "../schemas/index.js";
import { requireAuth } from "../middleware/auth.js";
import { getMembership, isAdmin } from "../lib/rbac.js";
import { logActivity } from "../lib/activity.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const userSelect = { id: true, email: true, name: true };

projectsRouter.get("/", async (req, res) => {
  const userId = req.authUser!.id;
  const showArchived = req.query.archived === "true";

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
  });

  const projects = memberships
    .map((m) => ({
      ...m.project,
      role: m.role,
      taskCount: m.project._count.tasks,
      memberCount: m.project._count.members,
    }))
    .filter((p) => (showArchived ? !!p.archivedAt : !p.archivedAt));

  return res.json({ projects });
});

projectsRouter.post("/", async (req, res) => {
  const parsed = parseBody(createProjectSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const userId = req.authUser!.id;
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        color: parsed.data.color ?? "#5b8cff",
      },
    });
    await tx.projectMember.create({
      data: { projectId: p.id, userId, role: "ADMIN" },
    });
    return p;
  });

  await logActivity({
    projectId: project.id,
    actorId: userId,
    action: "PROJECT_CREATED",
    entityType: "project",
    entityId: project.id,
    meta: { name: project.name },
  });

  return res.status(201).json({ project: { ...project, role: "ADMIN" as const } });
});

projectsRouter.get("/:projectId", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: userSelect } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return notFound(res, "Project not found");

  return res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      archivedAt: project.archivedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      role: membership.role,
      taskCount: project._count.tasks,
      members: project.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
        joinedAt: m.createdAt,
      })),
    },
  });
});

projectsRouter.get("/:projectId/activity", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const activities = await prisma.activityLog.findMany({
    where: { projectId },
    include: { actor: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return res.json({ activities });
});

projectsRouter.get("/:projectId/member-stats", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: userSelect } },
  });

  const stats = await Promise.all(
    members.map(async (m) => {
      const [assigned, created, done] = await Promise.all([
        prisma.task.count({ where: { projectId, assigneeId: m.userId, status: { not: "DONE" } } }),
        prisma.task.count({ where: { projectId, createdById: m.userId } }),
        prisma.task.count({ where: { projectId, assigneeId: m.userId, status: "DONE" } }),
      ]);
      return {
        userId: m.userId,
        user: m.user,
        role: m.role,
        openAssigned: assigned,
        tasksCreated: created,
        tasksCompleted: done,
      };
    })
  );

  return res.json({ stats });
});

projectsRouter.patch("/:projectId", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;
  const parsed = parseBody(updateProjectSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can update the project");

  const data: { name?: string; description?: string; color?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;

  const project = await prisma.project.update({ where: { id: projectId }, data });

  await logActivity({
    projectId,
    actorId: userId,
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: projectId,
    meta: data,
  });

  return res.json({ project: { ...project, role: membership.role } });
});

projectsRouter.post("/:projectId/archive", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can archive the project");

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "PROJECT_ARCHIVED",
    entityType: "project",
    entityId: projectId,
  });

  return res.json({ project });
});

projectsRouter.post("/:projectId/unarchive", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can restore the project");

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: null },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "PROJECT_RESTORED",
    entityType: "project",
    entityId: projectId,
  });

  return res.json({ project });
});

projectsRouter.post("/:projectId/leave", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");

  if (isAdmin(membership.role)) {
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return badRequest(res, "Promote another admin before leaving, or archive the project");
    }
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId, projectId } },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "MEMBER_LEFT",
    entityType: "member",
    entityId: userId,
  });

  return res.status(204).send();
});

projectsRouter.delete("/:projectId", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can delete the project");

  await prisma.project.delete({ where: { id: projectId } });
  return res.status(204).send();
});

projectsRouter.post("/:projectId/members", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId } = req.params;
  const parsed = parseBody(addMemberSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can add members");

  const userToAdd = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!userToAdd) return notFound(res, "No user with that email");

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: userToAdd.id, projectId } },
  });
  if (existing) return conflict(res, "User is already a project member");

  const member = await prisma.projectMember.create({
    data: { projectId, userId: userToAdd.id, role: parsed.data.role },
    include: { user: { select: userSelect } },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "MEMBER_ADDED",
    entityType: "member",
    entityId: userToAdd.id,
    meta: { email: userToAdd.email, role: parsed.data.role },
  });

  return res.status(201).json({
    member: { userId: member.userId, role: member.role, user: member.user },
  });
});

projectsRouter.patch("/:projectId/members/:memberUserId", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId, memberUserId } = req.params;
  const parsed = parseBody(updateMemberRoleSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.error);

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can change roles");

  const target = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: memberUserId, projectId } },
  });
  if (!target) return notFound(res, "Member not found");

  if (memberUserId === userId && parsed.data.role === "MEMBER") {
    const adminCount = await prisma.projectMember.count({ where: { projectId, role: "ADMIN" } });
    if (adminCount <= 1) return badRequest(res, "Project must keep at least one admin");
  }

  const updated = await prisma.projectMember.update({
    where: { userId_projectId: { userId: memberUserId, projectId } },
    data: { role: parsed.data.role },
    include: { user: { select: userSelect } },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "MEMBER_ROLE_CHANGED",
    entityType: "member",
    entityId: memberUserId,
    meta: { role: parsed.data.role },
  });

  return res.json({
    member: { userId: updated.userId, role: updated.role, user: updated.user },
  });
});

projectsRouter.delete("/:projectId/members/:memberUserId", async (req, res) => {
  const userId = req.authUser!.id;
  const { projectId, memberUserId } = req.params;

  const membership = await getMembership(userId, projectId);
  if (!membership) return forbidden(res, "You are not a member of this project");
  if (!isAdmin(membership.role)) return forbidden(res, "Only admins can remove members");

  const target = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: memberUserId, projectId } },
  });
  if (!target) return notFound(res, "Member not found");

  if (memberUserId === userId) {
    return badRequest(res, "Admins cannot remove themselves; transfer admin first");
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.projectMember.count({ where: { projectId, role: "ADMIN" } });
    if (adminCount <= 1) return badRequest(res, "Cannot remove the last admin");
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId: memberUserId, projectId } },
  });

  await logActivity({
    projectId,
    actorId: userId,
    action: "MEMBER_REMOVED",
    entityType: "member",
    entityId: memberUserId,
  });

  return res.status(204).send();
});
