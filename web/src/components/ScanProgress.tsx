import { useEffect, useState } from "react";
import { useSastStore } from "../store/sast";
import clsx from "clsx";
import { Loader2, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { formatDateTime, formatTime, nowISO } from "../lib/datetime";

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
    <div id="results" className="scroll-mt-24 animate-fade-up">
      <div className="card p-7 relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-50/40">
        {status === "error" ? (
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-danger-50 text-danger-600 grid place-items-center border border-danger-200 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-[17px] text-surface-900 leading-tight">
                Error durante el análisis
              </div>
              <div className="text-[14px] text-surface-500 mt-1 break-words">
                {error ?? "Error desconocido"}
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="chip chip-gray inline-flex items-center gap-1.5">
                  <CalendarClock size={11} />
                  {formatDateTime(startedDisplay, { seconds: true })}
                </span>
                <span className="chip chip-red inline-flex items-center gap-1.5">
                  <Clock size={11} />
                  Error a las {formatTime(startedDisplay)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-100 text-primary-700 grid place-items-center shadow-soft shrink-0">
                <Loader2 size={22} className="animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[17px] text-surface-900 leading-tight">
                  Escaneando tu código…
                </div>
                <div className="text-[13px] text-surface-500 mt-0.5">
                  Por favor espera mientras detectamos vulnerabilidades.
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip chip-blue inline-flex items-center gap-1.5">
                  <CalendarClock size={11} /> Inicio {formatTime(startedDisplay)}
                </span>
                <span className="chip chip-gray inline-flex items-center gap-1.5">
                  <Clock size={11} />{" "}
                  {elapsedMin > 0 ? `${elapsedMin}m ` : ""}
                  {elapsedS}s transcurridos
                </span>
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all border",
                      active
                        ? "bg-white border-surface-200 shadow-soft"
                        : "bg-surface-50/60 border-transparent opacity-70",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg grid place-items-center text-xs font-bold shrink-0",
                        done
                          ? "bg-success-500 text-white shadow-soft"
                          : active
                          ? "bg-primary-100 text-primary-700 ring-2 ring-primary-200"
                          : "bg-surface-100 text-surface-400",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-surface-800">
                        {s.label}
                      </div>
                      <div className="text-[12px] text-surface-500">{s.detail}</div>
                    </div>
                    {active && !done && (
                      <div className="h-1.5 w-24 rounded-full bg-surface-100 overflow-hidden shrink-0">
                        <div
                          className="h-full w-1/2 rounded-full animate-pulse"
                          style={{
                            background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                          }}
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
