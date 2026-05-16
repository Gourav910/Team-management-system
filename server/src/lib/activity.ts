import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function logActivity(opts: {
  projectId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
}) {
  await prisma.activityLog.create({
    data: {
      projectId: opts.projectId,
      actorId: opts.actorId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      meta: opts.meta ?? {},
    },
  });
}
