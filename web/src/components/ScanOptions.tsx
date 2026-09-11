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
  { value: "secrets", label: "Secretos + crypto", count: 2 },
];

const REPORT_FORMATS: { value: ReportFormat; label: string; icon: typeof BookText }[] = [
  { value: "sarif", label: "SARIF", icon: BookText },
  { value: "json", label: "JSON", icon: Sliders },
  { value: "html", label: "HTML", icon: FolderOpen },
];

const SEV: { value: Severity; label: string; dot: string; active: string; rest: string }[] = [
  {
    value: "critical",
    label: "Crítico+",
    dot: "bg-danger-500",
    active: "border-danger-500 bg-danger-50 text-danger-700",
    rest: "border-surface-200 text-surface-500 hover:bg-surface-50",
  },
  {
    value: "high",
    label: "Alto+",
    dot: "bg-warning-500",
    active: "border-warning-500 bg-warning-50 text-warning-700",
    rest: "border-surface-200 text-surface-500 hover:bg-surface-50",
  },
  {
    value: "medium",
    label: "Medio+",
    dot: "bg-[#eab308]",
    active: "border-[#ca8a04] bg-[#fef9c3] text-[#854d0e]",
    rest: "border-surface-200 text-surface-500 hover:bg-surface-50",
  },
  {
    value: "low",
    label: "Bajo+",
    dot: "bg-success-500",
    active: "border-success-500 bg-success-50 text-success-700",
    rest: "border-surface-200 text-surface-500 hover:bg-surface-50",
  },
  {
    value: "all",
    label: "Todos",
    dot: "bg-primary-500",
    active: "border-primary-500 bg-primary-50 text-primary-700",
    rest: "border-surface-200 text-surface-500 hover:bg-surface-50",
  },
];

export default function ScanOptions() {
  const options = useSastStore((s) => s.options);
  const setOption = useSastStore((s) => s.setOption);
  const status = useSastStore((s) => s.status);
  const run = useSastStore((s) => s.runScan);
  const reset = useSastStore((s) => s.reset);
  const mode = useSastStore((s) => s.mode);
  const hasContent =
    useSastStore((s) => s.pasteValue.length > 0) ||
    useSastStore((s) => s.nativeFiles.length > 0);
  const result = useSastStore((s) => s.result);

  const setFormat = (f: ReportFormat) => {
    const next = new Set(options.report_formats);
    next.has(f) ? next.delete(f) : next.add(f);
    if (next.size === 0) next.add("sarif");
    setOption("report_formats", Array.from(next) as ReportFormat[]);
  };

  return (
    <div className="card p-5 space-y-5">
      {/* RULESET */}
      <div>
        <label className="text-[13px] font-semibold text-surface-700 mb-2 flex items-center gap-1.5">
          <Settings2 size={14} strokeWidth={2.2} />
          Conjunto de reglas
        </label>
        <div className="relative">
          <select
            value={options.ruleset ?? "all"}
            onChange={(e) => setOption("ruleset", e.target.value)}
            className="w-full appearance-none pr-10 input-field font-medium"
          >
            {RULESETS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-600 pointer-events-none">
            {options.ruleset === "all"
              ? 8
              : options.ruleset === "owasp"
                ? 6
                : options.ruleset === "injection"
                  ? 3
                  : 2}
          </span>
        </div>
      </div>

      {/* REPORT FORMAT */}
      <div>
        <label className="text-[13px] font-semibold text-surface-700 mb-2 block">
          Formato de reporte
        </label>
        <div className="grid grid-cols-3 gap-2">
          {REPORT_FORMATS.map((f) => {
            const on = options.report_formats.includes(f.value);
            return (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`relative rounded-xl border py-2.5 px-2 text-[12px] font-semibold transition flex flex-col items-center gap-1.5 ${
                  on
                    ? "bg-primary-50 border-primary-500 text-primary-700 shadow-soft"
                    : "bg-white border-surface-200 text-surface-500 hover:bg-surface-50"
                }`}
              >
                {on && (
                  <CheckCircle2
                    size={12}
                    className="absolute top-1.5 right-1.5 text-primary-600"
                    strokeWidth={2.6}
                  />
                )}
                <f.icon size={15} strokeWidth={2} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* INCLUDE TESTS TOGGLE */}
      <div>
        <label className="flex items-center justify-between gap-3 cursor-pointer select-none group">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-surface-700">
              Incluir pruebas y carpetas
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] text-surface-600 font-medium">
                <FolderOpen size={11} />
                tests/
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-50 border border-surface-200 text-[11px] text-surface-600 font-mono">
                test_*.py
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOption("exclude_tests", !options.exclude_tests)}
            className={`relative w-12 h-7 rounded-full transition shrink-0 ${
              options.exclude_tests ? "bg-primary-500" : "bg-surface-300"
            }`}
            aria-pressed={!options.exclude_tests}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-soft transition-all ${
                options.exclude_tests ? "left-[calc(100%-26px)]" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* MIN SEVERITY */}
      <div>
        <label className="text-[13px] font-semibold text-surface-700 mb-2 block">
          Severidad mínima
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {SEV.map((s) => (
            <button
              key={s.value}
              onClick={() => setOption("min_severity", s.value)}
              className={`rounded-xl border py-2 px-1.5 text-[11px] font-bold uppercase transition flex flex-col items-center gap-1 ${
                options.min_severity === s.value ? s.active : s.rest
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* MIN CONFIDENCE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[13px] font-semibold text-surface-700">
            Confianza mínima
          </label>
          <span className="text-[12px] font-bold text-primary-700 font-mono">
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
          className="w-full accent-primary-600"
        />
        <div className="flex justify-between text-[10px] text-surface-500 mt-1 font-medium">
          <span>0% (todos)</span>
          <span>50%</span>
          <span>100% (solo alta confianza)</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="pt-3 border-t border-surface-100 flex flex-wrap gap-2">
        <button
          className="btn-primary flex-1 min-w-[160px]"
          disabled={status === "loading" || !hasContent}
          onClick={() => run()}
        >
          {status === "loading" ? (
            <>
              <svg
                className="animate-spin"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity=".25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Analizando…
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" /> Analizar
              {mode === "paste" ? " código" : " archivos"}
            </>
          )}
        </button>
        {result && (
          <button className="btn-secondary" onClick={reset}>
            <RotateCcw size={14} /> Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
