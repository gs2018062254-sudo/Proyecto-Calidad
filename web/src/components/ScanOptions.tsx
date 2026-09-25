import { useState } from "react";
import { useSastStore } from "../store/sast";
import type { Severity, ReportFormat } from "../types";
import {
  Play,
  RotateCcw,
  BookText,
  FolderOpen,
  CheckCircle2,
  Sliders,
  ChevronDown,
  Loader2,
} from "lucide-react";

const RULESETS = [
  { value: "all", label: "Todas las reglas (12)", count: 12 },
  { value: "owasp", label: "Solo OWASP Top 10", count: 10 },
  { value: "injection", label: "Inyecciones únicamente", count: 4 },
  { value: "secrets", label: "Secretos y criptografía", count: 3 },
];

const REPORT_FORMATS: { value: ReportFormat; label: string; icon: typeof BookText }[] = [
  { value: "sarif", label: "SARIF", icon: BookText },
  { value: "json", label: "JSON", icon: Sliders },
  { value: "html", label: "HTML", icon: FolderOpen },
];

const SEV: { value: Severity; label: string; dot: string }[] = [
  { value: "all", label: "Todos", dot: "bg-blue-500" },
  { value: "low", label: "Bajo+", dot: "bg-emerald-500" },
  { value: "medium", label: "Medio+", dot: "bg-yellow-500" },
  { value: "high", label: "Alto+", dot: "bg-orange-500" },
  { value: "critical", label: "Crítico", dot: "bg-rose-500" },
];

export default function ScanOptions() {
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const actionLabel =
    mode === "paste"
      ? "Analizar código"
      : mode === "files"
      ? "Analizar archivos"
      : "Analizar repositorio";

  return (
    <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-4">
      {/* BOTÓN PRINCIPAL DE ACCIÓN (Action-First) */}
      <div className="space-y-2">
        <button
          className="w-full studio-btn-primary !py-2.5 !text-sm !font-semibold !justify-center shadow-lg shadow-blue-500/10"
          disabled={status === "loading" || !hasContent}
          onClick={() => (mode === "github" ? runGitHubScan() : run())}
        >
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Escaneando seguridad…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play size={15} fill="currentColor" />
              {actionLabel}
            </span>
          )}
        </button>

        {!hasContent && (
          <p className="text-[11px] text-center text-[var(--studio-text-faint)]">
            {mode === "paste"
              ? "Ingresa código en el editor para comenzar"
              : mode === "files"
              ? "Agrega uno o más archivos para escanear"
              : "Ingresa un repositorio de GitHub para analizar"}
          </p>
        )}

        {result && (
          <button
            className="w-full studio-btn-secondary !justify-center !py-1.5 text-xs text-[var(--studio-text-secondary)]"
            onClick={reset}
          >
            <RotateCcw size={12} /> Limpiar resultados
          </button>
        )}
      </div>

      {/* REGLAS BÁSICAS (Siempre visible) */}
      <div className="pt-3 border-t border-[var(--studio-border)]">
        <label className="text-xs font-medium text-slate-200 mb-1.5 flex items-center justify-between">
          <span>Conjunto de reglas</span>
          <span className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
            {RULESETS.find((r) => r.value === options.ruleset)?.count || 12} activas
          </span>
        </label>
        <select
          value={options.ruleset ?? "all"}
          onChange={(e) => setOption("ruleset", e.target.value)}
          className="w-full studio-select !py-2 cursor-pointer text-xs"
        >
          {RULESETS.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#0b101d] text-slate-100">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* DIVULGACIÓN PROGRESIVA: AJUSTES AVANZADOS */}
      <div className="pt-2 border-t border-[var(--studio-border)] space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-[var(--radius-sm)] text-xs text-[var(--studio-text-secondary)] hover:text-slate-200 hover:bg-[var(--studio-surface)] transition group"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Sliders size={13} className="text-blue-400 group-hover:text-blue-300" />
            Opciones avanzadas
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--studio-text-faint)]">
            {showAdvanced ? "Ocultar" : "Configurar"}
            <ChevronDown
              size={13}
              className={`transform transition-transform duration-200 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {/* Resumen sutil cuando está plegado */}
        {!showAdvanced && (
          <div className="text-[11px] font-mono text-[var(--studio-text-faint)] px-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 uppercase">
              {options.report_formats.join(", ")}
            </span>
            <span>·</span>
            <span>Sev: {options.min_severity}</span>
            <span>·</span>
            <span>Conf: {Math.round(options.min_confidence * 100)}%</span>
            {options.exclude_tests && (
              <>
                <span>·</span>
                <span className="text-blue-400/80">Sin tests</span>
              </>
            )}
          </div>
        )}

        {/* Panel desplegado */}
        {showAdvanced && (
          <div className="space-y-3.5 pt-1 pl-1 pr-1 border-t border-[var(--studio-border)]/50 animate-in fade-in duration-150">
            {/* Formatos de reporte */}
            <div>
              <label className="text-xs text-[var(--studio-text-secondary)] mb-1.5 block">
                Formatos de exportación
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {REPORT_FORMATS.map((f) => {
                  const on = options.report_formats.includes(f.value);
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={`rounded-[var(--radius-sm)] border py-1.5 px-1.5 text-xs font-medium transition flex flex-col items-center gap-1 ${
                        on
                          ? "bg-[var(--studio-surface-active)] border-blue-500/60 text-blue-300"
                          : "bg-[var(--studio-surface)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-slate-200"
                      }`}
                    >
                      {on && <CheckCircle2 size={11} className="text-blue-400" />}
                      <f.icon size={13} className={on ? "text-blue-400" : "text-slate-400"} />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Omitir tests */}
            <div className="pt-2 border-t border-[var(--studio-border)]/50">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-200">
                    Omitir archivos de pruebas
                  </div>
                  <div className="text-[11px] text-[var(--studio-text-faint)] font-mono mt-0.5">
                    Evita falsas alertas en carpetas test/
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOption("exclude_tests", !options.exclude_tests)}
                  className={`relative w-9 h-5 rounded-full transition shrink-0 ${
                    options.exclude_tests
                      ? "bg-blue-600"
                      : "bg-slate-800 border border-slate-700"
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

            {/* Severidad mínima */}
            <div className="pt-2 border-t border-[var(--studio-border)]/50">
              <label className="text-xs text-[var(--studio-text-secondary)] mb-1.5 block">
                Filtrar por severidad mínima
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
                          ? "bg-[var(--studio-surface-active)] border-blue-500/60 text-white font-semibold"
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

            {/* Confianza mínima */}
            <div className="pt-2 border-t border-[var(--studio-border)]/50">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--studio-text-secondary)]">
                  Umbral de confianza
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
                <span>0% (Todos)</span>
                <span>50%</span>
                <span>100% (Solo certeros)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
