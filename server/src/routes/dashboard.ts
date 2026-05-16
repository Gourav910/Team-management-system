import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const userId = req.authUser!.id;
  const now = new Date();

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true, project: { select: { id: true, name: true } } },
  });

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return res.json({
      projects: [],
      totals: { TODO: 0, IN_PROGRESS: 0, DONE: 0, overdue: 0 },
      overdueTasks: [],
      myTasks: [],
    });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  const totals = { TODO: 0, IN_PROGRESS: 0, DONE: 0, overdue: 0 };
  const overdueTasks: typeof tasks = [];
  const myTasks: typeof tasks = [];

  for (const t of tasks) {
    totals[t.status] += 1;
    const incomplete = t.status !== "DONE";
    const overdue = incomplete && t.dueDate && t.dueDate < now;
    if (overdue) {
      totals.overdue += 1;
      overdueTasks.push(t);
    }
    if (t.assigneeId === userId) {
      myTasks.push(t);
    }
  }

  overdueTasks.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  myTasks.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));

  return res.json({
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      role: m.role,
    })),
    totals,
    overdueTasks: overdueTasks.map(sanitizeTask),
    myTasks: myTasks.map(sanitizeTask),
  });
});

function sanitizeTask(t: {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  project: { id: string; name: string };
  assignee: { id: string; name: string; email: string } | null;
}) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate,
    project: t.project,
    assignee: t.assignee,
  };
}
