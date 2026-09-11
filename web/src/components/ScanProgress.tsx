import { useSastStore } from "../store/sast";
import clsx from "clsx";

const STAGES = [
  { label: "Iniciando motor", detail: "Preparando analizador Python" },
  { label: "Parseando AST", detail: "Construyendo árbol sintáctico" },
  { label: "Taint analysis", detail: "Rastreando flujo source → sink" },
  { label: "Generando reporte", detail: "Clasificando y ordenando hallazgos" },
];

export default function ScanProgress() {
  const status = useSastStore((s) => s.status);
  const stage = useSastStore((s) => s.progressStage);
  const error = useSastStore((s) => s.error);

  if (status !== "loading" && status !== "error") return null;

  return (
    <div id="results" className="scroll-mt-24 animate-fadeup">
      <div className="glass-surface rounded-2xl p-7 relative overflow-hidden">
        {status === "error" ? (
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-neon-pink/15 text-neon-pink grid place-items-center">
              ⚠️
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-white">
                Error durante el análisis
              </div>
              <div className="text-sm text-slate-400 mt-1 break-words">
                {error ?? "Error desconocido"}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[rgba(0,209,255,0.12)] text-neon-cyan grid place-items-center shadow-neon-sm">
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
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
              </div>
              <div>
                <div className="font-display font-semibold text-white">
                  Escaneando tu código…
                </div>
                <div className="text-sm text-slate-400">
                  Por favor espera mientras detectamos vulnerabilidades.
                </div>
              </div>
            </div>
            <ol className="space-y-3">
              {STAGES.map((s, i) => {
                const active = i <= stage;
                const done = i < stage;
                return (
                  <li
                    key={i}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                      active ? "bg-white/4" : "opacity-60",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-md grid place-items-center text-xs font-bold",
                        done
                          ? "bg-neon-emerald text-night-900"
                          : active
                          ? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan/40"
                          : "bg-white/5 text-slate-500",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">
                        {s.label}
                      </div>
                      <div className="text-xs text-slate-500">{s.detail}</div>
                    </div>
                    {active && !done && (
                      <div className="h-1.5 w-24 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full w-1/2 shimmer-bg rounded-full" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
