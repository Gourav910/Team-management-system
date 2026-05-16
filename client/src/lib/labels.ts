export function activityLabel(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case "PROJECT_CREATED":
      return `created project "${String(meta.name ?? "")}"`;
    case "PROJECT_UPDATED":
      return "updated project settings";
    case "PROJECT_ARCHIVED":
      return "archived the project";
    case "PROJECT_RESTORED":
      return "restored the project";
    case "MEMBER_ADDED":
      return `added ${String(meta.email ?? "a member")} as ${String(meta.role ?? "MEMBER")}`;
    case "MEMBER_REMOVED":
      return "removed a team member";
    case "MEMBER_ROLE_CHANGED":
      return `changed a member role to ${String(meta.role ?? "")}`;
    case "MEMBER_LEFT":
      return "left the project";
    case "TASK_CREATED":
      return `created task "${String(meta.title ?? "")}"`;
    case "TASK_UPDATED":
      return `updated task "${String(meta.title ?? "")}"`;
    case "TASK_DELETED":
      return `deleted task "${String(meta.title ?? "")}"`;
    case "COMMENT_ADDED":
      return `commented on "${String(meta.taskTitle ?? "a task")}"`;
    default:
      return action.replaceAll("_", " ").toLowerCase();
  }
}

export function priorityClass(p: string): string {
  if (p === "URGENT") return "priority-urgent";
  if (p === "HIGH") return "priority-high";
  if (p === "LOW") return "priority-low";
  return "priority-medium";
}
