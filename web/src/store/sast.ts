import { create } from "zustand";
import type {
  FindingDto,
  GitHubRepo,
  GitHubUser,
  HistoryEntry,
  ScanMode,
  ScanOptions,
  ScanResponse,
  ScanStatus,
  Severity,
  UploadedFile,
} from "../types";
import {
  runScan,
  downloadFile,
  fetchGitHubUser,
  fetchGitHubRepos,
  runGitHubScan as apiRunGitHubScan,
} from "../lib/api";
import { DEMO_SOURCE } from "../lib/demo";
import { formatForFilename, nowISO } from "../lib/datetime";

export type ProgressStage = 0 | 1 | 2 | 3;

const LS_HISTORY_KEY = "sast.history.v1";
const LS_OPTIONS_KEY = "sast.options.v1";
const LS_GITHUB_TOKEN_KEY = "sast.github.token";
const LS_GITHUB_USER_KEY = "sast.github.user";
const BROADCAST_CH = "sast-realtime-sync";

type BroadcastMsg =
  | { type: "history:changed"; sentAt: string }
  | { type: "options:changed"; sentAt: string };

let bc: BroadcastChannel | null = null;
try {
  bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(BROADCAST_CH) : null;
} catch {
  bc = null;
}

const SEV_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  all: 0,
};

function maxSeverityFromFindings(findings: FindingDto[]): Severity | "all" {
  let best: Severity | "all" = "all";
  let rank = 0;
  for (const f of findings) {
    const r = SEV_ORDER[f.severity] ?? 0;
    if (r > rank) {
      rank = r;
      best = f.severity;
    }
  }
  return best;
}

function totalSeverities(s: HistoryEntry["summary"]): number {
  return (s.critical || 0) + (s.high || 0) + (s.medium || 0) + (s.low || 0) + (s.info || 0);
}

function loadOptionsPersisted(): ScanOptions {
  try {
    const raw = localStorage.getItem(LS_OPTIONS_KEY);
    if (raw) return JSON.parse(raw) as ScanOptions;
  } catch {}
  return {
    min_confidence: 0,
    min_severity: "all",
    exclude_tests: false,
    ruleset: "all",
    report_formats: ["sarif"],
  };
}

function saveOptionsPersisted(o: ScanOptions) {
  try {
    localStorage.setItem(LS_OPTIONS_KEY, JSON.stringify(o));
  } catch {}
}

function loadHistoryPersisted(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HistoryEntry[];
  } catch {}
  return [];
}

function saveHistoryPersisted(list: HistoryEntry[]) {
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

function loadGithubToken(): string | null {
  try {
    return localStorage.getItem(LS_GITHUB_TOKEN_KEY);
  } catch {}
  return null;
}

function saveGithubToken(token: string | null) {
  try {
    if (token) localStorage.setItem(LS_GITHUB_TOKEN_KEY, token);
    else localStorage.removeItem(LS_GITHUB_TOKEN_KEY);
  } catch {}
}

function loadGithubUser(): GitHubUser | null {
  try {
    const raw = localStorage.getItem(LS_GITHUB_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveGithubUser(user: GitHubUser | null) {
  try {
    if (user) localStorage.setItem(LS_GITHUB_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_GITHUB_USER_KEY);
  } catch {}
}

function buildFindingKey(f: FindingDto, idx: number) {
  return `${f.file_path}:${f.line}:${f.rule_id}:${idx}`;
}

export interface SastStore {
  mode: ScanMode;
  pasteValue: string;
  pasteFilename: string;
  files: UploadedFile[];
  nativeFiles: File[];
  options: ScanOptions;
  status: ScanStatus;
  progressStage: ProgressStage;
  result: ScanResponse | null;
  error?: string;
  activeSeverityFilter: Severity;
  expandedFindingId: string | null;
  activeFile: string;
  history: HistoryEntry[];
  startedAt?: string;
  // GitHub integration state & actions
  githubToken: string | null;
  githubUser: GitHubUser | null;
  githubRepos: GitHubRepo[];
  githubLoading: boolean;
  githubError: string | null;
  selectedRepo: GitHubRepo | null;
  selectedBranch: string;
  githubPublicRepoInput: string;
  setGithubPublicRepoInput: (url: string) => void;
  loginGithubWithToken: (token: string) => Promise<void>;
  logoutGithub: () => void;
  fetchGithubRepos: (username?: string) => Promise<void>;
  setSelectedRepo: (repo: GitHubRepo | null) => void;
  setSelectedBranch: (branch: string) => void;
  runGitHubScan: (repoInput?: string, branchInput?: string) => Promise<void>;
  // actions
  setMode: (m: ScanMode) => void;
  setPaste: (v: string, filename?: string) => void;
  addNativeFiles: (list: File[]) => Promise<void>;
  removeFile: (name: string) => void;
  clearFiles: () => void;
  setOption: <K extends keyof ScanOptions>(k: K, v: ScanOptions[K]) => void;
  runScan: () => Promise<void>;
  loadDemo: () => void;
  reset: () => void;
  toggleExpand: (key: string | null) => void;
  setActiveSeverity: (s: Severity) => void;
  setActiveFile: (f: string) => void;
  // history live actions
  loadHistoryFromStorage: () => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  loadHistoryResult: (id: string) => void;
  exportHistoryEntry: (id: string, format: "json" | "sarif" | "html") => Promise<void>;
  // exports (with timestamps)
  exportJson: () => void;
  exportSarif: () => Promise<void>;
  exportHtml: () => Promise<void>;
}

export const useSastStore = create<SastStore>((set, get) => {
  // Broadcast sync subscribers
  if (bc) {
    bc.onmessage = (ev: MessageEvent<BroadcastMsg>) => {
      const data = ev.data as BroadcastMsg | undefined;
      if (!data) return;
      if (data.type === "history:changed") {
        const fresh = loadHistoryPersisted();
        set({ history: fresh });
      } else if (data.type === "options:changed") {
        const fresh = loadOptionsPersisted();
        set({ options: fresh });
      }
    };
  }

  // Listen storage events as fallback (cross-origin/tab fallbacks)
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === LS_HISTORY_KEY) {
        set({ history: loadHistoryPersisted() });
      } else if (e.key === LS_OPTIONS_KEY) {
        set({ options: loadOptionsPersisted() });
      }
    });
  }

  return {
    mode: "paste",
    pasteValue: "",
    pasteFilename: "source.py",
    files: [],
    nativeFiles: [],
    options: loadOptionsPersisted(),
    status: "idle",
    progressStage: 0,
    result: null,
    activeSeverityFilter: "all",
    expandedFindingId: null,
    activeFile: "",
    history: loadHistoryPersisted(),
    // GitHub initial state
    githubToken: loadGithubToken(),
    githubUser: loadGithubUser(),
    githubRepos: [],
    githubLoading: false,
    githubError: null,
    selectedRepo: null,
    selectedBranch: "main",
    githubPublicRepoInput: "",

    setMode: (m) => {
      try {
        if (m !== "paste" && m !== "files" && m !== "github") return;
        set({ mode: m });
      } catch {}
    },
    setPaste: (v, filename) => {
      try {
        const safeValue = typeof v === "string" ? v : v == null ? "" : String(v);
        const safeName =
          typeof filename === "string" && filename.trim() !== ""
            ? filename.trim()
            : undefined;
        set((s) => ({
          pasteValue: safeValue,
          pasteFilename: safeName ?? s.pasteFilename,
        }));
      } catch {}
    },
    addNativeFiles: async (list) => {
      try {
        if (!Array.isArray(list)) return;
        const allowedExts = new Set([".py", ".pyw"]);
        const valid = list.filter((f: any) => {
          if (!f || typeof f.name !== "string" || typeof f.text !== "function") return false;
          const ext = "." + String(f.name.split(".").pop() || "").toLowerCase();
          return allowedExts.has(ext);
        }) as File[];
        const uploaded: UploadedFile[] = [];
        for (const f of valid) {
          const text = await f
            .text()
            .catch(() => "");
          uploaded.push({
            name: String(f.name || "file.py"),
            size: typeof f.size === "number" ? f.size : String(text).length,
            content: typeof text === "string" ? text : "",
          });
        }
        set((s) => {
          const merged = [...s.nativeFiles];
          const mergedUp = [...s.files];
          for (const f of valid) {
            if (!merged.find((x) => x.name === f.name && x.size === f.size)) merged.push(f);
          }
          for (const u of uploaded) {
            if (!mergedUp.find((x) => x.name === u.name)) mergedUp.push(u);
          }
          return { nativeFiles: merged, files: mergedUp, mode: "files" };
        });
      } catch {}
    },
    removeFile: (name) => {
      try {
        set((s) => ({
          nativeFiles: s.nativeFiles.filter((f) => f.name !== name),
          files: s.files.filter((f) => f.name !== name),
        }));
      } catch {}
    },
    clearFiles: () => {
      try {
        set({ nativeFiles: [], files: [] });
      } catch {}
    },

    setOption: (k, v) =>
      set((s) => {
        const next = { ...s.options, [k]: v };
        saveOptionsPersisted(next);
        try {
          bc?.postMessage({ type: "options:changed", sentAt: nowISO() } as BroadcastMsg);
        } catch {}
        return { options: next };
      }),

    runScan: async () => {
      const st = get();
      if (st.status === "loading") return;
      set({ status: "loading", progressStage: 0, error: undefined, result: null, startedAt: nowISO() });

      const timers: number[] = [];
      timers.push(window.setTimeout(() => set({ progressStage: 1 }), 220));
      timers.push(window.setTimeout(() => set({ progressStage: 2 }), 700));
      timers.push(window.setTimeout(() => set({ progressStage: 3 }), 1400));

      try {
        const params = {
          source: st.mode === "paste" ? st.pasteValue : undefined,
          filename: st.mode === "paste" ? st.pasteFilename : undefined,
          files: st.mode === "files" ? st.nativeFiles : undefined,
          min_confidence: st.options.min_confidence,
          min_severity:
            st.options.min_severity === "all" || st.options.min_severity === "info"
              ? undefined
              : st.options.min_severity,
          exclude_tests: st.options.exclude_tests,
          include_sarif: st.options.report_formats.includes("sarif"),
          include_html: st.options.report_formats.includes("html"),
        };
        const res = await runScan(params);
        // Ensure timestamp always present (frontend fallback)
        const timestamped: ScanResponse = {
          ...res,
          timestamp: res.timestamp || nowISO(),
          timezone: res.timezone || "UTC",
        };
        const firstFile =
          res.findings[0]?.file_path ??
          Object.keys(res.sources || {})[0] ??
          "";

        // Push to history + persist + broadcast
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          created_at: timestamped.timestamp || nowISO(),
          target: timestamped.target,
          mode: st.mode,
          files: timestamped.files_scanned,
          duration_ms: timestamped.duration_ms,
          summary: timestamped.summary,
          severity_max: maxSeverityFromFindings(timestamped.findings),
          severity_count: totalSeverities(timestamped.summary),
          result: timestamped,
        };
        const nextHistory = [entry, ...get().history].slice(0, 200);
        saveHistoryPersisted(nextHistory);
        try {
          bc?.postMessage({ type: "history:changed", sentAt: nowISO() } as BroadcastMsg);
        } catch {}

        set({
          result: timestamped,
          status: "ready",
          activeFile: firstFile,
          progressStage: 3,
          expandedFindingId: null,
          history: nextHistory,
        });
      } catch (err: any) {
        set({
          status: "error",
          error: err?.message || String(err),
          progressStage: 0,
        });
      } finally {
        timers.forEach((t) => clearTimeout(t));
      }
    },

    loadDemo: () => {
      set({
        mode: "paste",
        pasteValue: DEMO_SOURCE,
        pasteFilename: "demo.py",
        status: "idle",
        result: null,
        error: undefined,
        progressStage: 0,
        expandedFindingId: null,
        activeSeverityFilter: "all",
        activeFile: "",
        nativeFiles: [],
        files: [],
      });
      if (typeof window !== "undefined") {
        try {
          // Manda evento para que Home haga scroll hasta el editor
          window.dispatchEvent(new CustomEvent("sast:load-demo", { detail: { at: nowISO() } }));
        } catch {}
      }
    },
    reset: () =>
      set({
        status: "idle",
        result: null,
        error: undefined,
        progressStage: 0,
        expandedFindingId: null,
        activeFile: "",
        activeSeverityFilter: "all",
      }),
    toggleExpand: (key) =>
      set((s) => ({
        expandedFindingId: s.expandedFindingId === key ? null : key,
      })),
    setActiveSeverity: (s) => set({ activeSeverityFilter: s }),
    setActiveFile: (f) => set({ activeFile: f }),

    // History live
    loadHistoryFromStorage: () => set({ history: loadHistoryPersisted() }),
    deleteHistoryEntry: (id) => {
      const next = get().history.filter((h) => h.id !== id);
      saveHistoryPersisted(next);
      try {
        bc?.postMessage({ type: "history:changed", sentAt: nowISO() } as BroadcastMsg);
      } catch {}
      set({ history: next });
    },
    clearHistory: () => {
      saveHistoryPersisted([]);
      try {
        bc?.postMessage({ type: "history:changed", sentAt: nowISO() } as BroadcastMsg);
      } catch {}
      set({ history: [] });
    },
    loadHistoryResult: (id) => {
      const h = get().history.find((x) => x.id === id);
      if (!h) return;
      const r = h.result;
      const firstFile =
        r.findings[0]?.file_path ?? Object.keys(r.sources || {})[0] ?? "";
      set({
        result: r,
        status: "ready",
        activeFile: firstFile,
        expandedFindingId: null,
        progressStage: 3,
      });
    },
    exportHistoryEntry: async (id, format) => {
      const h = get().history.find((x) => x.id === id);
      if (!h) return;
      const stamp = formatForFilename(h.created_at);
      const safe = (n: string) => n.replace(/[^a-z0-9._-]+/gi, "_");
      const base = `sast-${safe(h.target)}-${stamp}`;
      if (format === "json") {
        downloadFile(`${base}.json`, JSON.stringify(h.result, null, 2), "application/json");
      } else if (format === "sarif") {
        if (h.result.sarif) {
          return downloadFile(`${base}.sarif.json`, JSON.stringify(h.result.sarif, null, 2), "application/sarif+json");
        }
      } else if (format === "html") {
        if (h.result.html_report) {
          return downloadFile(`${base}.html`, h.result.html_report, "text/html");
        }
      }
    },

    // Exports current result with timestamps in filename
    exportJson: () => {
      const r = get().result;
      if (!r) return;
      const stamp = formatForFilename(r.timestamp || null);
      const safe = (n: string) => n.replace(/[^a-z0-9._-]+/gi, "_");
      downloadFile(
        `sast-report-${safe(r.target)}-${stamp}.json`,
        JSON.stringify(r, null, 2),
        "application/json",
      );
    },
    exportSarif: async () => {
      const st = get();
      const r = st.result;
      if (!r) return;
      const stamp = formatForFilename(r.timestamp || null);
      const safe = (n: string) => n.replace(/[^a-z0-9._-]+/gi, "_");
      if (r.sarif) {
        return downloadFile(
          `sast-report-${safe(r.target)}-${stamp}.sarif.json`,
          JSON.stringify(r.sarif, null, 2),
          "application/sarif+json",
        );
      }
      const params = {
        source: st.mode === "paste" ? st.pasteValue : undefined,
        filename: st.mode === "paste" ? st.pasteFilename : undefined,
        files: st.mode === "files" ? st.nativeFiles : undefined,
        min_confidence: st.options.min_confidence,
        min_severity:
          st.options.min_severity === "all" || st.options.min_severity === "info"
            ? undefined
            : st.options.min_severity,
        exclude_tests: st.options.exclude_tests,
        include_sarif: true,
      };
      try {
        const withSarif = await runScan(params);
        if (withSarif.sarif) {
          downloadFile(
            `sast-report-${safe(withSarif.target)}-${formatForFilename(withSarif.timestamp || null)}.sarif.json`,
            JSON.stringify(withSarif.sarif, null, 2),
            "application/sarif+json",
          );
        }
      } catch (e: any) {
        alert("No se pudo generar SARIF: " + e.message);
      }
    },
    exportHtml: async () => {
      const st = get();
      const r = st.result;
      if (!r) return;
      const stamp = formatForFilename(r.timestamp || null);
      const safe = (n: string) => n.replace(/[^a-z0-9._-]+/gi, "_");
      if (r.html_report) {
        return downloadFile(
          `sast-report-${safe(r.target)}-${stamp}.html`,
          r.html_report,
          "text/html",
        );
      }
      const params = {
        source: st.mode === "paste" ? st.pasteValue : undefined,
        filename: st.mode === "paste" ? st.pasteFilename : undefined,
        files: st.mode === "files" ? st.nativeFiles : undefined,
        min_confidence: st.options.min_confidence,
        min_severity:
          st.options.min_severity === "all" || st.options.min_severity === "info"
            ? undefined
            : st.options.min_severity,
        exclude_tests: st.options.exclude_tests,
        include_html: true,
      };
      try {
        const withHtml = await runScan(params);
        if (withHtml.html_report) {
          downloadFile(
            `sast-report-${safe(withHtml.target)}-${formatForFilename(withHtml.timestamp || null)}.html`,
            withHtml.html_report,
            "text/html",
          );
        }
      } catch (e: any) {
        alert("No se pudo generar el reporte HTML: " + e.message);
      }
    },

    // ==========================================
    // GitHub integration actions
    // ==========================================
    setGithubPublicRepoInput: (url: string) => set({ githubPublicRepoInput: url, githubError: null }),

    setSelectedRepo: (repo: GitHubRepo | null) =>
      set({
        selectedRepo: repo,
        selectedBranch: repo?.default_branch || "main",
        githubError: null,
      }),

    setSelectedBranch: (branch: string) => set({ selectedBranch: branch }),

    loginGithubWithToken: async (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken) return;
      set({ githubLoading: true, githubError: null });
      try {
        const user = await fetchGitHubUser(cleanToken);
        saveGithubToken(cleanToken);
        saveGithubUser(user);
        set({ githubToken: cleanToken, githubUser: user, githubLoading: false });
        get().fetchGithubRepos();
      } catch (err: any) {
        set({
          githubLoading: false,
          githubError: err?.message || "Error al autenticar con el token de GitHub.",
        });
      }
    },

    logoutGithub: () => {
      saveGithubToken(null);
      saveGithubUser(null);
      set({
        githubToken: null,
        githubUser: null,
        githubRepos: [],
        selectedRepo: null,
        githubError: null,
      });
    },

    fetchGithubRepos: async (username?: string) => {
      const { githubToken } = get();
      set({ githubLoading: true, githubError: null });
      try {
        const repos = await fetchGitHubRepos(githubToken || undefined, username);
        set({ githubRepos: repos, githubLoading: false });
      } catch (err: any) {
        set({
          githubLoading: false,
          githubError: err?.message || "Error al cargar repositorios de GitHub.",
        });
      }
    },

    runGitHubScan: async (repoInput?: string, branchInput?: string) => {
      const st = get();
      if (st.status === "loading") return;

      const targetRepo =
        repoInput?.trim() ||
        st.selectedRepo?.full_name ||
        st.githubPublicRepoInput.trim();

      const targetBranch =
        branchInput?.trim() ||
        st.selectedBranch ||
        st.selectedRepo?.default_branch ||
        "main";

      if (!targetRepo) {
        set({ githubError: "Por favor selecciona un repositorio o ingresa el nombre/URL del proyecto." });
        return;
      }

      set({
        status: "loading",
        progressStage: 0,
        error: undefined,
        result: null,
        startedAt: nowISO(),
        githubError: null,
      });

      const timers: number[] = [];
      timers.push(window.setTimeout(() => set({ progressStage: 1 }), 300));
      timers.push(window.setTimeout(() => set({ progressStage: 2 }), 1000));
      timers.push(window.setTimeout(() => set({ progressStage: 3 }), 2000));

      try {
        const res = await apiRunGitHubScan({
          repo: targetRepo,
          branch: targetBranch,
          token: st.githubToken || undefined,
          min_confidence: st.options.min_confidence,
          min_severity:
            st.options.min_severity === "all" || st.options.min_severity === "info"
              ? undefined
              : st.options.min_severity,
          exclude_tests: st.options.exclude_tests,
          include_sarif: st.options.report_formats.includes("sarif"),
          include_html: st.options.report_formats.includes("html"),
        });

        const timestamped: ScanResponse = {
          ...res,
          timestamp: res.timestamp || nowISO(),
          timezone: res.timezone || "UTC",
        };

        const firstFile =
          res.findings[0]?.file_path ??
          Object.keys(res.sources || {})[0] ??
          "";

        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          created_at: timestamped.timestamp || nowISO(),
          target: timestamped.target,
          mode: "github",
          files: timestamped.files_scanned,
          duration_ms: timestamped.duration_ms,
          summary: timestamped.summary,
          severity_max: maxSeverityFromFindings(timestamped.findings),
          severity_count: totalSeverities(timestamped.summary),
          result: timestamped,
        };

        const nextHistory = [entry, ...get().history].slice(0, 200);
        saveHistoryPersisted(nextHistory);
        try {
          bc?.postMessage({ type: "history:changed", sentAt: nowISO() } as BroadcastMsg);
        } catch {}

        set({
          result: timestamped,
          status: "ready",
          activeFile: firstFile,
          progressStage: 3,
          expandedFindingId: null,
          history: nextHistory,
        });
      } catch (err: any) {
        set({
          status: "error",
          error: err?.message || String(err),
          githubError: err?.message || String(err),
          progressStage: 0,
        });
      } finally {
        timers.forEach((t) => clearTimeout(t));
      }
    },
  };
});

export { buildFindingKey };
