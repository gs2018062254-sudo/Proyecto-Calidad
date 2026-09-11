import type { ScanResponse, RuleDto } from "../types";

export const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = API_BASE + path;
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, error: text || `HTTP ${res.status}` };
  }
  if (!res.ok || data.ok === false) {
    const err = data?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(err);
  }
  return data as T;
}

export interface ScanParams {
  source?: string;
  filename?: string;
  files?: File[];
  min_confidence?: number;
  min_severity?: string;
  exclude_tests?: boolean;
  include_sarif?: boolean;
  include_html?: boolean;
}

export async function runScan(p: ScanParams): Promise<ScanResponse> {
  if (p.files && p.files.length > 0) {
    const form = new FormData();
    p.files.forEach((f) => form.append("files", f));
    if (p.min_confidence != null) form.set("min_confidence", String(p.min_confidence));
    if (p.min_severity) form.set("min_severity", p.min_severity);
    form.set("exclude_tests", p.exclude_tests ? "true" : "false");
    if (p.include_sarif) form.set("include_sarif", "true");
    if (p.include_html) form.set("include_html", "true");
    return request<ScanResponse>("/api/scan", {
      method: "POST",
      body: form,
    });
  }

  return request<ScanResponse>("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: p.source,
      filename: p.filename,
      min_confidence: p.min_confidence,
      min_severity: p.min_severity,
      exclude_tests: p.exclude_tests,
      include_sarif: p.include_sarif,
      include_html: p.include_html,
    }),
  });
}

export async function fetchRules(): Promise<RuleDto[]> {
  const r = await request<{ ok: boolean; rules: RuleDto[] }>("/api/rules");
  return r.rules || [];
}

export async function health(): Promise<{ ok: boolean; engine?: string }> {
  try {
    return await request("/api/health");
  } catch {
    return { ok: false };
  }
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ==========================================
// GitHub Integration Endpoints
// ==========================================

export async function fetchGitHubUser(token: string): Promise<import("../types").GitHubUser> {
  const res = await request<{ ok: boolean; user: import("../types").GitHubUser }>("/api/github/user", {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
  });
  return res.user;
}

export async function fetchGitHubRepos(
  token?: string,
  username?: string,
  page: number = 1,
): Promise<import("../types").GitHubRepo[]> {
  const headers: Record<string, string> = {};
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  const q = new URLSearchParams();
  if (username) q.set("username", username.trim());
  q.set("page", String(page));
  q.set("per_page", "50");

  const res = await request<{ ok: boolean; repos: import("../types").GitHubRepo[] }>(
    `/api/github/repos?${q.toString()}`,
    { headers },
  );
  return res.repos || [];
}

export interface GitHubScanParams {
  repo: string;
  branch?: string;
  token?: string;
  min_confidence?: number;
  min_severity?: string;
  exclude_tests?: boolean;
  include_sarif?: boolean;
  include_html?: boolean;
}

export async function runGitHubScan(p: GitHubScanParams): Promise<ScanResponse> {
  return request<ScanResponse>("/api/github/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo: p.repo,
      branch: p.branch,
      min_confidence: p.min_confidence,
      min_severity: p.min_severity,
      exclude_tests: p.exclude_tests,
      include_sarif: p.include_sarif,
      include_html: p.include_html,
    }),
  });
}
