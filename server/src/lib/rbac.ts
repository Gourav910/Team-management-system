import type { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function getMembership(
  userId: string,
  projectId: string
): Promise<{ role: ProjectRole } | null> {
  const row = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });
  return row;
}

export function isAdmin(role: ProjectRole): boolean {
  return role === "ADMIN";
}
