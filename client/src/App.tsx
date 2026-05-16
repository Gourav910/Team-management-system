import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <span>Team Tracker</span>
        </div>
        <nav className="actions">
          <Link className="btn btn-ghost" to="/">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" to="/projects">
            Projects
          </Link>
          <Link className="btn btn-ghost" to="/settings">
            Settings
          </Link>
          <span className="muted">{user?.name}</span>
          <button type="button" className="btn btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Shell>
              <DashboardPage />
            </Shell>
          </Protected>
        }
      />
      <Route
        path="/projects"
        element={
          <Protected>
            <Shell>
              <ProjectsPage />
            </Shell>
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Shell>
              <SettingsPage />
            </Shell>
          </Protected>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <Protected>
            <Shell>
              <ProjectPage />
            </Shell>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
