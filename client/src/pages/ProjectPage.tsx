import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, useApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { activityLabel, priorityClass } from "../lib/labels";
import type {
  Activity,
  Comment,
  Member,
  MemberStat,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "../types";
import { PRIORITY_OPTIONS, PROJECT_COLORS, STATUS_OPTIONS } from "../types";

type ProjectDetail = {
  id: string;
  name: string;
  description: string;
  color: string;
  archivedAt: string | null;
  role: "ADMIN" | "MEMBER";
  taskCount: number;
  members: Member[];
};

type Tab = "tasks" | "team" | "settings" | "activity";

function toIsoFromLocal(dtLocal: string): string | null {
  if (!dtLocal) return null;
  const d = new Date(dtLocal);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function ProjectPage() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const call = useApi();

  const [tab, setTab] = useState<Tab>("tasks");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterQ, setFilterQ] = useState("");

  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");

  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsColor, setSettingsColor] = useState("#5b8cff");

  const isAdmin = project?.role === "ADMIN";
  const isArchived = !!project?.archivedAt;

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const pRes = await call<{ project: ProjectDetail }>(`/projects/${projectId}`);
    setProject(pRes.project);
    setSettingsName(pRes.project.name);
    setSettingsDesc(pRes.project.description);
    setSettingsColor(pRes.project.color || "#5b8cff");
  }, [call, projectId]);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPriority) params.set("priority", filterPriority);
    if (filterAssignee) params.set("assigneeId", filterAssignee);
    if (filterQ.trim()) params.set("q", filterQ.trim());
    const qs = params.toString();
    const tRes = await call<{ tasks: TaskRow[] }>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ""}`);
    setTasks(tRes.tasks);
  }, [call, projectId, filterStatus, filterPriority, filterAssignee, filterQ]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      await loadProject();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load project");
    }
  }, [loadProject, projectId]);

  // Load project details once on mount
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Re-fetch tasks whenever filters or projectId change
  useEffect(() => {
    void loadTasks().catch((e) => {
      if (e instanceof ApiError) setError(e.message);
    });
  }, [loadTasks]);

  const loadTabData = useCallback(async () => {
    if (!projectId) return;
    if (tab === "activity") {
      const res = await call<{ activities: Activity[] }>(`/projects/${projectId}/activity`);
      setActivities(res.activities);
    }
    if (tab === "team") {
      const res = await call<{ stats: MemberStat[] }>(`/projects/${projectId}/member-stats`);
      setMemberStats(res.stats);
    }
  }, [call, projectId, tab]);

  useEffect(() => {
    void loadTabData().catch((e) => {
      if (e instanceof ApiError) setError(e.message);
    });
  }, [loadTabData]);

  async function openTask(task: TaskRow) {
    setSelectedTask(task);
    setCommentBody("");
    try {
      const res = await call<{ comments: Comment[] }>(`/tasks/${task.id}/comments`);
      setComments(res.comments);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load comments");
    }
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setError(null);
    try {
      await call(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail("");
      await loadProject();
      if (tab === "team") await loadTabData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not invite member");
    }
  }

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!projectId || isArchived) return;
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: taskTitle,
        description: taskDescription,
        status: "TODO",
        priority: taskPriority,
      };
      if (taskAssignee) body.assigneeId = taskAssignee;
      const due = toIsoFromLocal(taskDue);
      if (due) body.dueDate = due;
      await call(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) });
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDue("");
      setTaskPriority("MEDIUM");
      await loadTasks();
      await loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create task");
    }
  }

  async function patchTask(id: string, body: Record<string, unknown>) {
    setError(null);
    try {
      const res = await call<{ task: TaskRow }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await loadTasks();
      // Use the server response to update the drawer — avoids stale state from the pre-fetch snapshot
      if (selectedTask?.id === id) {
        setSelectedTask(res.task);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update task");
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setError(null);
    try {
      await call(`/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      });
      setCommentBody("");
      const res = await call<{ comments: Comment[] }>(`/tasks/${selectedTask.id}/comments`);
      setComments(res.comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add comment");
    }
  }

  async function saveProjectSettings(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setError(null);
    try {
      await call(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: settingsName, description: settingsDesc, color: settingsColor }),
      });
      await loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings");
    }
  }

  async function archiveProject() {
    if (!projectId || !confirm("Archive this project? Tasks stay read-only until restored.")) return;
    try {
      await call(`/projects/${projectId}/archive`, { method: "POST" });
      await loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not archive project");
    }
  }

  async function unarchiveProject() {
    if (!projectId) return;
    try {
      await call(`/projects/${projectId}/unarchive`, { method: "POST" });
      await loadProject();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restore project");
    }
  }

  async function leaveProject() {
    if (!projectId || !confirm("Leave this project?")) return;
    try {
      await call(`/projects/${projectId}/leave`, { method: "POST" });
      nav("/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not leave project");
    }
  }

  const memberOptions = useMemo(() => project?.members ?? [], [project]);
  const soleAdmin = project?.members.filter((m) => m.role === "ADMIN").length === 1;

  if (!projectId) return <div className="flash">Missing project id</div>;
  if (error && !project) return <div className="flash">{error}</div>;
  if (!project) return <p className="muted">Loading…</p>;

  return (
    <div className="grid">
      <div className="project-header">
        <div className="project-color-bar" style={{ background: project.color }} />
        <div style={{ flex: 1 }}>
          <div className="muted">
            <Link to="/projects">Projects</Link> / {project.name}
          </div>
          <h1 className="h1">{project.name}</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            {project.description || "No description"}
          </p>
          <span className={`badge ${project.role === "ADMIN" ? "badge-admin" : "badge-member"}`}>
            {project.role}
          </span>
          {isArchived ? <span className="badge" style={{ marginLeft: 8 }}>ARCHIVED</span> : null}
        </div>
      </div>

      {isArchived ? (
        <div className="archived-banner">This project is archived. Restore it in Settings to add or edit tasks.</div>
      ) : null}

      {error ? <div className="flash">{error}</div> : null}

      <nav className="tabs">
        {(["tasks", "team", "settings", "activity"] as Tab[]).map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {tab === "tasks" && (
        <>
          <div className="filters card" style={{ padding: "1rem" }}>
            <div className="field">
              <div className="label">Status</div>
              <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <div className="label">Priority</div>
              <select className="input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="">All</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <div className="label">Assignee</div>
              <select className="input" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                <option value="">All</option>
                <option value="me">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
                {memberOptions.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <div className="label">Search</div>
              <input className="input" placeholder="Title or description…" value={filterQ} onChange={(e) => setFilterQ(e.target.value)} />
            </div>
          </div>

          {!isArchived && (
            <div className="card">
              <h2 className="h2">New task</h2>
              <form onSubmit={onCreateTask}>
                <div className="row">
                  <div className="field" style={{ flex: 2 }}>
                    <div className="label">Title</div>
                    <input className="input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
                  </div>
                  <div className="field">
                    <div className="label">Priority</div>
                    <select className="input" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <div className="label">Description</div>
                  <textarea className="input" rows={2} value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
                </div>
                <div className="row">
                  <div className="field" style={{ flex: 1 }}>
                    <div className="label">Assignee</div>
                    <select className="input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                      <option value="">Unassigned</option>
                      {memberOptions.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <div className="label">Due</div>
                    <input className="input" type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-end" }}>
                    Add task
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="h2">Tasks ({tasks.length})</h2>
            {tasks.length === 0 ? (
              <p className="muted">No tasks match your filters.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => void openTask(t)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        {(t._count?.comments ?? 0) > 0 ? (
                          <span className="muted" style={{ fontSize: "0.8rem" }}>
                            {" "}
                            · {t._count?.comments} comment(s)
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="input"
                          value={t.status}
                          disabled={isArchived}
                          onChange={(e) => patchTask(t.id, { status: e.target.value as TaskStatus })}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="muted">{t.assignee?.name ?? "—"}</td>
                      <td>{t.dueDate ? new Date(t.dueDate).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "team" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 className="h2">Team members</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  {isAdmin ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {project.members.map((m) => (
                  <tr key={m.userId}>
                    <td>
                      <div>{m.user.name}</div>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {m.user.email}
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          className="input"
                          value={m.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            call(`/projects/${projectId}/members/${m.userId}`, {
                              method: "PATCH",
                              body: JSON.stringify({ role: newRole }),
                            }).then(() => loadProject()).catch((err) =>
                              setError(err instanceof ApiError ? err.message : "Could not change role")
                            );
                          }}
                          disabled={m.userId === user?.id && soleAdmin && m.role === "ADMIN"}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                        </select>
                      ) : (
                        <span className={`badge ${m.role === "ADMIN" ? "badge-admin" : "badge-member"}`}>{m.role}</span>
                      )}
                    </td>
                    {isAdmin ? (
                      <td>
                        {m.userId !== user?.id ? (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                              if (confirm("Remove member?")) {
                                call(`/projects/${projectId}/members/${m.userId}`, { method: "DELETE" })
                                  .then(() => loadProject())
                                  .catch((err) =>
                                    setError(err instanceof ApiError ? err.message : "Could not remove member")
                                  );
                              }
                            }}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="muted">You</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {isAdmin && !isArchived ? (
              <form onSubmit={onInvite} style={{ marginTop: "1rem" }}>
                <h3 className="h2">Invite by email</h3>
                <div className="row">
                  <input
                    className="input"
                    style={{ flex: 2 }}
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}>
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button className="btn btn-primary" type="submit">
                    Add
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="card">
            <h2 className="h2">Workload</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Open</th>
                  <th>Created</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((s) => (
                  <tr key={s.userId}>
                    <td>{s.user.name}</td>
                    <td>{s.openAssigned}</td>
                    <td>{s.tasksCreated}</td>
                    <td>{s.tasksCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid grid-2">
          {isAdmin ? (
            <div className="card">
              <h2 className="h2">Project settings</h2>
              <form onSubmit={saveProjectSettings}>
                <div className="field">
                  <div className="label">Name</div>
                  <input className="input" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} required />
                </div>
                <div className="field">
                  <div className="label">Description</div>
                  <textarea className="input" rows={3} value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} />
                </div>
                <div className="field">
                  <div className="label">Accent color</div>
                  <div className="row">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-swatch ${settingsColor === c ? "color-swatch-selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => setSettingsColor(c)}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isArchived}>
                  Save changes
                </button>
              </form>
              <div className="divider" />
              {isArchived ? (
                <button type="button" className="btn btn-primary" onClick={() => void unarchiveProject()}>
                  Restore project
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => void archiveProject()}>
                  Archive project
                </button>
              )}
            </div>
          ) : (
            <div className="card">
              <p className="muted">Only admins can edit project settings.</p>
            </div>
          )}
          <div className="card">
            <h2 className="h2">Membership</h2>
            <p className="muted">Leave this project if you no longer need access.</p>
            <button type="button" className="btn btn-danger" onClick={() => void leaveProject()}>
              Leave project
            </button>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="card">
          <h2 className="h2">Recent activity</h2>
          {activities.length === 0 ? (
            <p className="muted">No activity yet.</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="activity-item">
                <strong>{a.actor.name}</strong> {activityLabel(a.action, a.meta)}
                <div className="activity-time">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedTask ? (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedTask(null)} />
          <aside className="drawer">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h2" style={{ margin: 0 }}>
                {selectedTask.title}
              </h2>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedTask(null)}>
                Close
              </button>
            </div>
            <p className="muted">{selectedTask.description || "No description"}</p>
            <div className="row" style={{ marginBottom: "1rem" }}>
              <select
                className="input"
                value={selectedTask.priority}
                disabled={isArchived}
                onChange={(e) => {
                  const p = e.target.value as TaskPriority;
                  patchTask(selectedTask.id, { priority: p });
                  setSelectedTask({ ...selectedTask, priority: p });
                }}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={selectedTask.status}
                disabled={isArchived}
                onChange={(e) => {
                  const s = e.target.value as TaskStatus;
                  patchTask(selectedTask.id, { status: s });
                  setSelectedTask({ ...selectedTask, status: s });
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <h3 className="h2">Comments</h3>
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-meta">
                  {c.author.name} · {new Date(c.createdAt).toLocaleString()}
                </div>
                <div>{c.body}</div>
              </div>
            ))}
            {!isArchived && (
              <form onSubmit={addComment}>
                <textarea className="input" rows={3} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} required />
                <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                  Add comment
                </button>
              </form>
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}
