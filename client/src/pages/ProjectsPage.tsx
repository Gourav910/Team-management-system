import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, useApi } from "../api";
import type { ProjectSummary } from "../types";
import { PROJECT_COLORS } from "../types";

export function ProjectsPage() {
  const call = useApi();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = showArchived ? "?archived=true" : "";
      const res = await call<{ projects: ProjectSummary[] }>(`/projects${qs}`);
      setProjects(res.projects);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load projects");
    }
  }, [call, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await call("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, color }),
      });
      setName("");
      setDescription("");
      setColor(PROJECT_COLORS[0]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
    }
  }

  return (
    <div className="grid">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Projects</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Create teams, assign roles, and track work together.
          </p>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">New project</h2>
          {error ? <div className="flash">{error}</div> : null}
          <form onSubmit={onCreate}>
            <div className="field">
              <div className="label">Name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <div className="label">Description</div>
              <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field">
              <div className="label">Color</div>
              <div className="row">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? "color-swatch-selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              Create project
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="h2">{showArchived ? "Archived projects" : "Active projects"}</h2>
          {projects.length === 0 ? (
            <p className="muted">No projects in this view.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Role</th>
                  <th>Tasks</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/projects/${p.id}`}>
                        <span className="color-dot" style={{ background: p.color }} />
                        {p.name}
                      </Link>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {p.memberCount} members
                        {p.archivedAt ? " · archived" : ""}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.role === "ADMIN" ? "badge-admin" : "badge-member"}`}>
                        {p.role}
                      </span>
                    </td>
                    <td>{p.taskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
