import { useSastStore } from "../store/sast";
import type { Severity, ReportFormat } from "../types";
import {
  Play,
  RotateCcw,
  Settings2,
  BookText,
  FolderOpen,
  CheckCircle2,
  Sliders,
} from "lucide-react";

const RULESETS = [
  { value: "all", label: "Todas las reglas (8)", count: 8 },
  { value: "owasp", label: "Solo OWASP Top 10", count: 6 },
  { value: "injection", label: "Inyecciones únicamente", count: 3 },
  { value: "secrets", label: "Secretos y criptografía", count: 2 },
];

const REPORT_FORMATS: { value: ReportFormat; label: string; icon: typeof BookText }[] = [
  { value: "sarif", label: "SARIF", icon: BookText },
  { value: "json", label: "JSON", icon: Sliders },
  { value: "html", label: "HTML", icon: FolderOpen },
];

const SEV: { value: Severity; label: string; dot: string }[] = [
  { value: "critical", label: "Crítico", dot: "bg-rose-500" },
  { value: "high", label: "Alto", dot: "bg-orange-500" },
  { value: "medium", label: "Medio", dot: "bg-yellow-500" },
  { value: "low", label: "Bajo", dot: "bg-emerald-500" },
  { value: "all", label: "Todos", dot: "bg-blue-500" },
];

export default function ScanOptions() {
  const options = useSastStore((s) => s.options);
  const setOption = useSastStore((s) => s.setOption);
  const status = useSastStore((s) => s.status);
  const run = useSastStore((s) => s.runScan);
  const runGitHubScan = useSastStore((s) => s.runGitHubScan);
  const reset = useSastStore((s) => s.reset);
  const mode = useSastStore((s) => s.mode);
  const hasContent = useSastStore((s) =>
    s.mode === "paste"
      ? s.pasteValue.length > 0
      : s.mode === "files"
      ? s.nativeFiles.length > 0
      : Boolean(s.selectedRepo || s.githubPublicRepoInput.trim().length > 0),
  );
  const result = useSastStore((s) => s.result);

  const setFormat = (f: ReportFormat) => {
    const next = new Set(options.report_formats);
    next.has(f) ? next.delete(f) : next.add(f);
    if (next.size === 0) next.add("sarif");
    setOption("report_formats", Array.from(next) as ReportFormat[]);
  };

  return (
    <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--studio-border)]">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Settings2 size={14} className="text-blue-400" />
          Opciones de análisis
        </label>
        <span className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
          Motor AST
        </span>
      </div>

      {/* RULESET */}
      <div>
        <label className="text-xs text-[var(--studio-text-secondary)] mb-1.5 block">
          Conjunto de reglas
        </label>
        <div className="relative">
          <select
            value={options.ruleset ?? "all"}
            onChange={(e) => setOption("ruleset", e.target.value)}
            className="w-full studio-select !py-1.5 cursor-pointer"
          >
            {RULESETS.map((r) => (
              <option key={r.value} value={r.value} className="bg-[#0b101d] text-slate-100">
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* REPORT FORMAT */}
      <div>
        <label className="text-xs text-[var(--studio-text-secondary)] mb-1.5 block">
          Formatos de reporte
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {REPORT_FORMATS.map((f) => {
            const on = options.report_formats.includes(f.value);
            return (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`rounded-[var(--radius-sm)] border py-2 px-1.5 text-xs font-medium transition flex flex-col items-center gap-1 ${
                  on
                    ? "bg-[var(--studio-surface-active)] border-blue-500/60 text-blue-300"
                    : "bg-[var(--studio-surface)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-slate-200"
                }`}
              >
                {on && (
                  <CheckCircle2
                    size={11}
                    className="text-blue-400"
                  />
                )}
                <f.icon size={14} className={on ? "text-blue-400" : "text-slate-400"} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* INCLUDE TESTS TOGGLE */}
      <div className="pt-2 border-t border-[var(--studio-border)]">
        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <div className="flex-1">
            <div className="text-xs font-medium text-slate-200">
              Omitir archivos de pruebas
            </div>
            <div className="text-[11px] text-[var(--studio-text-secondary)] font-mono mt-0.5">
              tests/ · test_*.py
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOption("exclude_tests", !options.exclude_tests)}
            className={`relative w-9 h-5 rounded-full transition shrink-0 ${
              options.exclude_tests ? "bg-blue-600" : "bg-slate-800 border border-slate-700"
            }`}
            aria-pressed={options.exclude_tests}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                options.exclude_tests ? "left-[calc(100%-18px)]" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* MIN SEVERITY */}
      <div className="pt-2 border-t border-[var(--studio-border)]">
        <label className="text-xs text-[var(--studio-text-secondary)] mb-1.5 block">
          Filtrar severidad mínima
        </label>
        <div className="grid grid-cols-5 gap-1">
          {SEV.map((s) => {
            const active = options.min_severity === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setOption("min_severity", s.value)}
                className={`rounded-[var(--radius-sm)] border py-1.5 px-1 text-[10px] font-mono transition flex flex-col items-center gap-0.5 ${
                  active
                    ? "bg-[var(--studio-surface-active)] border-blue-500/60 text-white"
                    : "bg-[var(--studio-surface)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-slate-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MIN CONFIDENCE */}
      <div className="pt-2 border-t border-[var(--studio-border)]">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-[var(--studio-text-secondary)]">
            Confianza mínima
          </label>
          <span className="text-xs font-bold text-blue-400 font-mono">
            ≥ {Math.round(options.min_confidence * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(options.min_confidence * 100)}
          onChange={(e) =>
            setOption("min_confidence", Number(e.target.value) / 100)
          }
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--studio-text-faint)] mt-0.5 font-mono">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="pt-2 border-t border-[var(--studio-border)] flex flex-wrap gap-2">
        <button
          className="studio-btn-primary flex-1 !justify-center"
          disabled={status === "loading" || !hasContent}
          onClick={() => (mode === "github" ? runGitHubScan() : run())}
        >
          {status === "loading" ? (
            <>Analizando código…</>
          ) : (
            <>
              <Play size={13} fill="currentColor" /> Analizar
              {mode === "paste" ? " código" : mode === "files" ? " archivos" : " repositorio"}
            </>
          )}
        </button>
        {result && (
          <button className="studio-btn-secondary" onClick={reset}>
            <RotateCcw size={13} /> Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
