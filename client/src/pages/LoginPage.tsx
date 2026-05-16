import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, token } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        }
      );
      login(res.token, res.user);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 440 }}>
      <div className="brand" style={{ marginBottom: "1rem" }}>
        <div className="brand-mark" />
        <span>Team Tracker</span>
      </div>
      <div className="card">
        <h1 className="h1">Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Welcome back. Use your work email and password.
        </p>
        {error ? <div className="flash">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <div className="label">Email</div>
            <input
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="btn btn-primary" type="submit">
              Continue
            </button>
            <span className="muted">
              New here? <Link to="/register">Create an account</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
