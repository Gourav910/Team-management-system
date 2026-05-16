import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, useApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { UserProfile } from "../types";

export function SettingsPage() {
  const call = useApi();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [emailOnAssign, setEmailOnAssign] = useState(true);
  const [emailOnDueSoon, setEmailOnDueSoon] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await call<{ user: UserProfile }>("/me");
      setProfile(res.user);
      setName(res.user.name);
      setEmailOnAssign(res.user.emailOnAssign);
      setEmailOnDueSoon(res.user.emailOnDueSoon);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load settings");
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    try {
      const res = await call<{ user: UserProfile }>("/me", {
        method: "PATCH",
        body: JSON.stringify({ name, emailOnAssign, emailOnDueSoon }),
      });
      setProfile(res.user);
      updateUser({ id: res.user.id, email: res.user.email, name: res.user.name });
      setSaved("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    try {
      await call("/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setSaved("Password updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    }
  }

  return (
    <div className="grid">
      <div>
        <h1 className="h1">Settings</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Account preferences for {user?.email}
        </p>
      </div>

      {error ? <div className="flash">{error}</div> : null}
      {saved ? (
        <div className="toast" role="status">
          {saved}
        </div>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Profile</h2>
          <form onSubmit={saveProfile}>
            <div className="field">
              <div className="label">Display name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <div className="label">Email</div>
              <input className="input" value={profile?.email ?? ""} disabled />
              <p className="hint">Email cannot be changed here.</p>
            </div>
            <button type="submit" className="btn btn-primary">
              Save profile
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="h2">Notifications</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
            Preferences for future email digests (in-app activity is always available).
          </p>
          <form onSubmit={saveProfile}>
            <label className="check-row">
              <input type="checkbox" checked={emailOnAssign} onChange={(e) => setEmailOnAssign(e.target.checked)} />
              Email when a task is assigned to me
            </label>
            <label className="check-row">
              <input type="checkbox" checked={emailOnDueSoon} onChange={(e) => setEmailOnDueSoon(e.target.checked)} />
              Email reminders for upcoming due dates
            </label>
            <div style={{ marginTop: "0.75rem" }}>
              <button type="submit" className="btn btn-primary">
                Save preferences
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 className="h2">Change password</h2>
        <form onSubmit={savePassword}>
          <div className="field">
            <div className="label">Current password</div>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <div className="label">New password</div>
            <input
              className="input"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-ghost">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
