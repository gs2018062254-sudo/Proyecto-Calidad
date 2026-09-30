import type { AuthUser, DemoLoginResponse, MeResponse } from "../types";
import { API_BASE } from "./api";

// ==========================================================================
// Persistencia en localStorage (stateless JWT, en claro en storage; no cookie)
// ==========================================================================

export const AUTH_TOKEN_KEY = "sast.auth.token";
export const AUTH_USER_KEY = "sast.auth.user";
const AUTH_REDIRECT_KEY = "sast.auth.redirectTo";

export type { AuthUser };

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

// ==========================================================================
// Low-level: storage helpers
// ==========================================================================

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveStoredAuth(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
}

export function saveRedirect(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_REDIRECT_KEY, path);
  } catch {}
}

export function consumeRedirect(): string {
  if (typeof window === "undefined") return "/";
  try {
    const p = window.localStorage.getItem(AUTH_REDIRECT_KEY);
    if (p) window.localStorage.removeItem(AUTH_REDIRECT_KEY);
    return p || "/";
  } catch {
    return "/";
  }
}

// ==========================================================================
// Token helpers
// ==========================================================================

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const exp = Number(payload.exp);
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

// ==========================================================================
// authFetch: wrapper fetch con JWT auto-injectado + manejo de 401
// ==========================================================================

export async function authFetch<T = any>(
  path: string,
  init?: RequestInit,
  opts?: { onUnauthorized?: () => void; skipAuth?: boolean },
): Promise<T> {
  const url = API_BASE + path;
  const initCopy: RequestInit = { ...(init || {}) };
  const hdrs: Record<string, string> = {};
  if (initCopy.headers) {
    if (initCopy.headers instanceof Headers) {
      initCopy.headers.forEach((v, k) => (hdrs[k] = v));
    } else if (Array.isArray(initCopy.headers)) {
      initCopy.headers.forEach(([k, v]) => (hdrs[k] = v));
    } else {
      Object.assign(hdrs, initCopy.headers as any);
    }
  }
  if (!opts?.skipAuth && !hdrs["Authorization"]) {
    const tok = getStoredToken();
    if (tok && !isTokenExpired(tok)) {
      hdrs["Authorization"] = `Bearer ${tok}`;
    }
  }
  initCopy.headers = hdrs;

  const res = await fetch(url, initCopy);
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (res.status === 401) {
    clearStoredAuth();
    opts?.onUnauthorized?.();
    const msg =
      (typeof data === "object" && data?.error) ||
      "Sesión expirada. Inicia sesión nuevamente.";
    throw new UnauthorizedError(msg, typeof data === "object" ? data : undefined);
  }

  if (!res.ok) {
    const msg =
      (typeof data === "object" && data?.error) ||
      `HTTP ${res.status}: ${text.slice(0, 120)}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).data = typeof data === "object" ? data : undefined;
    throw err;
  }

  return data as T;
}

export class UnauthorizedError extends Error {
  data?: any;
  constructor(msg: string, data?: any) {
    super(msg);
    this.name = "UnauthorizedError";
    this.data = data;
  }
}

// ==========================================================================
// Login / Logout API calls
// ==========================================================================

export async function loginDemo(email: string, password: string): Promise<DemoLoginResponse> {
  const res = await fetch(API_BASE + "/api/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status} al autenticar.`);
  }
  return data as DemoLoginResponse;
}

export async function fetchMe(): Promise<MeResponse> {
  return authFetch<MeResponse>("/api/auth/me", { method: "GET" });
}

export async function logoutBackend(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" }, { skipAuth: true });
  } catch {}
  clearStoredAuth();
}

export function googleLoginUrl(): string {
  return API_BASE + "/api/auth/login";
}

export function githubLoginUrl(): string {
  return googleLoginUrl();
}

// ==========================================================================
// Hidratación al cargar la app: lee localStorage + valida contra /me si es viejo
// ==========================================================================

export function hydrateAuthFromStorage(): AuthState {
  const token = getStoredToken();
  const user = getStoredUser();
  if (!token) {
    clearStoredAuth();
    return { token: null, user: null };
  }
  if (isTokenExpired(token)) {
    clearStoredAuth();
    return { token: null, user: null };
  }
  return { token, user };
}
