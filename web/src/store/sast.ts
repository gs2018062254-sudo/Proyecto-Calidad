import { create } from "zustand";
import type {
  FindingDto,
  ScanMode,
  ScanOptions,
  ScanResponse,
  ScanStatus,
  Severity,
  UploadedFile,
} from "../types";
import { runScan, downloadFile } from "../lib/api";
import { DEMO_SOURCE } from "../lib/demo";

export type ProgressStage = 0 | 1 | 2 | 3;

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
  exportJson: () => void;
  exportSarif: () => Promise<void>;
  exportHtml: () => Promise<void>;
}

function buildFindingKey(f: FindingDto, idx: number) {
  return `${f.file_path}:${f.line}:${f.rule_id}:${idx}`;
}

export const useSastStore = create<SastStore>((set, get) => ({
  mode: "paste",
  pasteValue: "",
  pasteFilename: "source.py",
  files: [],
  nativeFiles: [],
  options: {
    min_confidence: 0,
    min_severity: "info",
    exclude_tests: true,
  },
  status: "idle",
  progressStage: 0,
  result: null,
  activeSeverityFilter: "all",
  expandedFindingId: null,
  activeFile: "",

  setMode: (m) => set({ mode: m }),
  setPaste: (v, filename) =>
    set((s) => ({
      pasteValue: v,
      pasteFilename: filename ?? s.pasteFilename,
    })),
  addNativeFiles: async (list) => {
    const allowedExts = new Set([".py", ".pyw", ".zip"]);
    const valid = list.filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return allowedExts.has(ext);
    });
    const uploaded: UploadedFile[] = [];
    for (const f of valid) {
      const text = await f.text().catch(() => "");
      uploaded.push({ name: f.name, size: f.size, content: text });
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
  },
  removeFile: (name) =>
    set((s) => ({
      nativeFiles: s.nativeFiles.filter((f) => f.name !== name),
      files: s.files.filter((f) => f.name !== name),
    })),
  clearFiles: () => set({ nativeFiles: [], files: [] }),
  setOption: (k, v) =>
    set((s) => ({ options: { ...s.options, [k]: v } })),
  runScan: async () => {
    const st = get();
    if (st.status === "loading") return;
    set({ status: "loading", progressStage: 0, error: undefined, result: null });

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
          st.options.min_severity === "info" ? undefined : st.options.min_severity,
        exclude_tests: st.options.exclude_tests,
        include_sarif: false,
        include_html: false,
      };
      const res = await runScan(params);
      const firstFile =
        res.findings[0]?.file_path ??
        Object.keys(res.sources || {})[0] ??
        "";
      set({
        result: res,
        status: "ready",
        activeFile: firstFile,
        progressStage: 3,
        expandedFindingId: null,
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
    });
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
  exportJson: () => {
    const r = get().result;
    if (!r) return;
    downloadFile(
      `sast-report-${Date.now()}.json`,
      JSON.stringify(r, null, 2),
      "application/json",
    );
  },
  exportSarif: async () => {
    const st = get();
    const r = st.result;
    if (!r) return;
    if (r.sarif) {
      return downloadFile(
        `sast-report-${Date.now()}.sarif.json`,
        JSON.stringify(r.sarif, null, 2),
        "application/sarif+json",
      );
    }
    // re-run asking for sarif
    const params = {
      source: st.mode === "paste" ? st.pasteValue : undefined,
      filename: st.mode === "paste" ? st.pasteFilename : undefined,
      files: st.mode === "files" ? st.nativeFiles : undefined,
      min_confidence: st.options.min_confidence,
      min_severity:
        st.options.min_severity === "info" ? undefined : st.options.min_severity,
      exclude_tests: st.options.exclude_tests,
      include_sarif: true,
    };
    try {
      const withSarif = await runScan(params);
      if (withSarif.sarif) {
        downloadFile(
          `sast-report-${Date.now()}.sarif.json`,
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
    if (r.html_report) {
      return downloadFile(
        `sast-report-${Date.now()}.html`,
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
        st.options.min_severity === "info" ? undefined : st.options.min_severity,
      exclude_tests: st.options.exclude_tests,
      include_html: true,
    };
    try {
      const withHtml = await runScan(params);
      if (withHtml.html_report) {
        downloadFile(
          `sast-report-${Date.now()}.html`,
          withHtml.html_report,
          "text/html",
        );
      }
    } catch (e: any) {
      alert("No se pudo generar el reporte HTML: " + e.message);
    }
  },
}));

export { buildFindingKey };
