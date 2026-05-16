import { useCallback } from "react";
import { useAuth } from "./auth/AuthContext";

type ApiOptions = RequestInit & { skipAuth?: boolean };

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = localStorage.getItem("team-tracker-token");
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`/api${path}`, { ...rest, headers: h });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const base =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    const detail =
      typeof data === "object" && data !== null && "detail" in data && (data as { detail?: unknown }).detail
        ? String((data as { detail: unknown }).detail)
        : "";
    const code =
      typeof data === "object" && data !== null && "code" in data && (data as { code?: unknown }).code
        ? String((data as { code: unknown }).code)
        : "";
    const parts = [base];
    if (detail) parts.push(detail);
    if (code) parts.push(`(${code})`);
    const msg = parts.filter(Boolean).join(" — ");
    throw new ApiError(msg || "Request failed", res.status, data);
  }

  return data as T;
}

export function useApi() {
  const { logout } = useAuth();
  return useCallback(
    async function call<T>(path: string, options: ApiOptions = {}) {
      try {
        return await api<T>(path, options);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          logout();
        }
        throw e;
      }
    },
    [logout]
  );
}
