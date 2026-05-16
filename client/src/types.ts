export type ProjectRole = "ADMIN" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  emailOnAssign: boolean;
  emailOnDueSoon: boolean;
  createdAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  color: string;
  archivedAt: string | null;
  role: ProjectRole;
  taskCount: number;
  memberCount: number;
};

export type Member = {
  userId: string;
  role: ProjectRole;
  user: { id: string; email: string; name: string };
  joinedAt: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; email: string; name: string } | null;
  createdBy: { id: string; email: string; name: string };
  _count?: { comments: number };
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

export type Activity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; email: string };
};

export type MemberStat = {
  userId: string;
  user: { id: string; name: string; email: string };
  role: ProjectRole;
  openAssigned: number;
  tasksCreated: number;
  tasksCompleted: number;
};

export const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export const PROJECT_COLORS = [
  "#5b8cff",
  "#48d597",
  "#f5c15c",
  "#ff6b6b",
  "#c084fc",
  "#38bdf8",
  "#fb923c",
  "#94a3b8",
];
