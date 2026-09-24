import { Activity, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--studio-border)] bg-[var(--studio-panel)]/95 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Scope / Engine title */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400 shrink-0">
            <Terminal size={15} strokeWidth={2} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-sm tracking-tight text-white">
              SAST Studio
            </span>
            <span className="text-[var(--studio-text-faint)] hidden sm:inline">/</span>
            <span className="text-xs text-[var(--studio-text-secondary)] hidden sm:inline font-mono">
              Consola de análisis estático
            </span>
          </div>
        </div>

        {/* Live Backend Telemetry & Quick Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Puerto 5001</span>
            <span className="text-emerald-400">Activo</span>
          </div>

          <Link
            to="/rules"
            className="studio-btn-secondary !text-xs !py-1 !px-2.5 inline-flex items-center gap-1.5"
          >
            <Activity size={13} className="text-blue-400" />
            <span>8 reglas</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
