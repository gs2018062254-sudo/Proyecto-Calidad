import { useEffect, useState } from "react";
import { useSastStore } from "../store/sast";
import clsx from "clsx";
import { Loader2, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { formatDateTime, formatTime, nowISO } from "../lib/datetime";

const STAGES = [
  { label: "Iniciando motor", detail: "Preparando analizador de seguridad Python" },
  { label: "Parseando AST", detail: "Construyendo árbol sintáctico abstracto" },
  { label: "Taint analysis", detail: "Rastreando flujo de fuentes a sumideros" },
  { label: "Generando reporte", detail: "Clasificando y ordenando hallazgos CWE" },
];

export default function ScanProgress() {
  const status = useSastStore((s) => s.status);
  const stage = useSastStore((s) => s.progressStage);
  const error = useSastStore((s) => s.error);
  const startedAt = useSastStore((s) => s.startedAt);
  const [startedDisplay, setStartedDisplay] = useState<string>(startedAt ?? nowISO());

  useEffect(() => {
    if (status === "loading" && !startedAt) {
      setStartedDisplay(nowISO());
    } else if (startedAt) {
      setStartedDisplay(startedAt);
    }
  }, [status, startedAt]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "loading") return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [status]);

  if (status !== "loading" && status !== "error") return null;

  const elapsedMs = startedDisplay
    ? Date.now() - new Date(startedDisplay).getTime()
    : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedS = elapsedSec % 60;

  return (
    <div id="results" className="scroll-mt-24">
      <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
        {status === "error" ? (
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-rose-950/40 text-rose-400 grid place-items-center border border-rose-800/60 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-base text-white leading-tight">
                Fallo durante el análisis
              </div>
              <div className="text-xs text-rose-300 mt-1 break-words font-mono">
                {error ?? "Error desconocido en el motor de análisis."}
              </div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="studio-badge">
                  <CalendarClock size={11} />
                  {formatDateTime(startedDisplay, { seconds: true })}
                </span>
                <span className="studio-badge studio-sev-critical">
                  <Clock size={11} />
                  Fallo a las {formatTime(startedDisplay)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] text-blue-400 grid place-items-center shrink-0">
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base text-white leading-tight">
                  Ejecutando análisis sintáctico…
                </div>
                <div className="text-xs text-[var(--studio-text-secondary)] mt-0.5">
                  Extrayendo nodos AST y analizando propagación de variables.
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="studio-badge text-blue-400">
                  <CalendarClock size={11} /> Inicio {formatTime(startedDisplay)}
                </span>
                <span className="studio-badge">
                  <Clock size={11} />{" "}
                  {elapsedMin > 0 ? `${elapsedMin}m ` : ""}
                  {elapsedS}s transcurridos
                </span>
              </div>
            </div>

            <ol className="space-y-2">
              {STAGES.map((s, i) => {
                const active = i <= stage;
                const done = i < stage;
                return (
                  <li
                    key={i}
                    className={clsx(
                      "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-all border",
                      done
                        ? "bg-[var(--studio-surface)] border-[var(--studio-border)] text-white"
                        : active
                        ? "bg-[var(--studio-surface-active)] border-blue-500/50 text-white"
                        : "bg-transparent border-[var(--studio-border)]/40 text-[var(--studio-text-faint)]",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-5 h-5 rounded-[2px] grid place-items-center text-[10px] font-mono font-bold shrink-0",
                        done
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                          : active
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-[var(--studio-panel)] text-[var(--studio-text-faint)] border border-[var(--studio-border)]",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">
                        {s.label}
                      </div>
                      <div className="text-[11px] text-[var(--studio-text-secondary)] font-mono">{s.detail}</div>
                    </div>
                    {active && !done && (
                      <div className="h-1 w-20 rounded-full bg-slate-900 overflow-hidden shrink-0">
                        <div
                          className="h-full w-2/3 rounded-full bg-blue-500 animate-pulse"
                        />
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
