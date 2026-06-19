const defaultApiBase = import.meta.env.PROD ? "https://api.lovestory.babyress.games/api" : "http://localhost:4000/api";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, "");

const tokenKey = "lovecheck.admin.token";

export function getAdminToken() {
  return localStorage.getItem(tokenKey);
}

export function saveAdminToken(token: string) {
  localStorage.setItem(tokenKey, token);
}

export function clearAdminToken() {
  localStorage.removeItem(tokenKey);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || "API error");
  return data as T;
}
