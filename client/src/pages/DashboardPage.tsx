import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, useApi } from "../api";

type Summary = {
  projects: { id: string; name: string; role: string }[];
  totals: { TODO: number; IN_PROGRESS: number; DONE: number; overdue: number };
  overdueTasks: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    project: { id: string; name: string };
  }[];
  myTasks: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    project: { id: string; name: string };
  }[];
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium" });
}

function statusClass(s: string) {
  if (s === "DONE") return "pill-done";
  if (s === "IN_PROGRESS") return "pill-progress";
  return "pill-todo";
}

export function DashboardPage() {
  const call = useApi();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await call<Summary>("/dashboard/summary");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call]);

  if (error) return <div className="flash">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div className="grid">
      <div>
        <h1 className="h1">Dashboard</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Snapshot across every project you belong to.
        </p>
      </div>

      <div className="grid grid-4">
        <div className="card stat">
          <div className="label">To do</div>
          <div className="stat-value">{data.totals.TODO}</div>
        </div>
        <div className="card stat">
          <div className="label">In progress</div>
          <div className="stat-value">{data.totals.IN_PROGRESS}</div>
        </div>
        <div className="card stat">
          <div className="label">Done</div>
          <div className="stat-value">{data.totals.DONE}</div>
        </div>
        <div className="card stat">
          <div className="label">Overdue</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>
            {data.totals.overdue}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Overdue tasks</h2>
          {data.overdueTasks.length === 0 ? (
            <p className="muted">Nothing overdue. Nice work.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className={`badge ${statusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                      <div>
                        <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                      </div>
                    </td>
                    <td className="muted">{t.project.name}</td>
                    <td className="pill-overdue">{fmt(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="h2">Assigned to me</h2>
          {data.myTasks.length === 0 ? (
            <p className="muted">No assignments yet. Ask a project admin to assign work.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.myTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className={`badge ${statusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                      <div>
                        <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                      </div>
                    </td>
                    <td className="muted">{t.project.name}</td>
                    <td>{fmt(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Your projects</h2>
        {data.projects.length === 0 ? (
          <p className="muted">
            No projects yet. <Link to="/projects">Create your first one</Link>.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/projects/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>
                    <span className={`badge ${p.role === "ADMIN" ? "badge-admin" : "badge-member"}`}>
                      {p.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
