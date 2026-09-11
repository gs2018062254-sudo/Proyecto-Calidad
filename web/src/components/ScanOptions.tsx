import { useSastStore } from "../store/sast";
import type { Severity } from "../types";
import clsx from "clsx";

const SEV_OPTIONS: { value: Exclude<Severity, "all">; label: string; emoji: string }[] = [
  { value: "critical", label: "Crítico+", emoji: "🔴" },
  { value: "high", label: "Alto+", emoji: "🟠" },
  { value: "medium", label: "Medio+", emoji: "🟡" },
  { value: "low", label: "Bajo+", emoji: "🟢" },
  { value: "info", label: "Todos", emoji: "🔵" },
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

  return (
    <div className="glass-surface rounded-2xl p-5 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-200">
            Confianza mínima
          </label>
          <span className="text-xs text-neon-emerald font-mono font-semibold">
            ≥ {Math.round(options.min_confidence * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(options.min_confidence * 100)}
          onChange={(e) => setOption("min_confidence", Number(e.target.value) / 100)}
          className="w-full accent-neon-emerald"
        />
        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
          <span>0% (todos)</span>
          <span>50%</span>
          <span>100% (solo alta confianza)</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200 mb-2 block">
          Severidad mínima a reportar
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {SEV_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setOption("min_severity", o.value)}
              className={clsx(
                "rounded-lg py-2 px-1.5 text-[11px] font-semibold uppercase transition",
                "border flex flex-col items-center gap-0.5",
                options.min_severity === o.value
                  ? "bg-[rgba(0,255,179,0.12)] border-neon-emerald/50 text-neon-emerald"
                  : "border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200",
              )}
            >
              <span className="text-[14px] leading-none">{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={options.exclude_tests}
          onChange={(e) => setOption("exclude_tests", e.target.checked)}
          className="w-4 h-4 accent-neon-emerald"
        />
        <span className="text-sm text-slate-300 group-hover:text-white transition">
          Excluir tests y carpetas <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded border border-white/5">tests/ / test_*.py</code>
        </span>
      </label>

      <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
        <button
          className="btn-neon flex-1 min-w-[160px]"
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
              <span className="text-base leading-none">🔍</span> Analizar
              {mode === "paste" ? " código" : " archivos"}
            </>
          )}
        </button>
        {result && (
          <button className="btn-ghost" onClick={reset}>
            ↺ Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
