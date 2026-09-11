import { useEffect, useMemo, useState } from "react";
import { useSastStore } from "../store/sast";
import type { HistoryEntry, Severity } from "../types";
import {
  Search,
  History as HistoryIcon,
  Clock,
  FileCode,
  Trash2,
  RefreshCw,
  PlayCircle,
} from "lucide-react";
import { formatDateTime, formatRelative, parseDate } from "../lib/datetime";
import { useNavigate } from "react-router-dom";

const SEV_CLASS: Record<string, string> = {
  critical: "studio-sev-critical",
  high: "studio-sev-high",
  medium: "studio-sev-medium",
  low: "studio-sev-low",
  info: "studio-sev-info",
  all: "",
};

const SEV_LABEL: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
  info: "Info",
  all: "Todos",
};

export default function History() {
  const history = useSastStore((s) => s.history);
  const loadFromStorage = useSastStore((s) => s.loadHistoryFromStorage);
  const deleteEntry = useSastStore((s) => s.deleteHistoryEntry);
  const clearHistory = useSastStore((s) => s.clearHistory);
  const loadResult = useSastStore((s) => s.loadHistoryResult);
  const navigate = useNavigate();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Live ticker for "hace X min" refresh every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [onlyWithVulns, setOnlyWithVulns] = useState(false);
  const [sinceHours, setSinceHours] = useState<number | "all">("all");
  const [mode, setMode] = useState<"all" | "paste" | "files">("all");
  const [view, setView] = useState<"table" | "list">("table");

  const now = Date.now();

  const filtered = useMemo<HistoryEntry[]>(() => {
    const query = q.trim().toLowerCase();
    return history.filter((h) => {
      if (mode !== "all" && h.mode !== mode) return false;
      if (sinceHours !== "all") {
        const t = parseDate(h.created_at)?.getTime() ?? 0;
        if (!t || now - t > sinceHours * 60 * 60 * 1000) return false;
      }
      if (severity !== "all") {
        const order: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1, all: 0 };
        const target = order[severity] ?? 0;
        const hSeverity = order[h.severity_max as string] ?? 0;
        if (hSeverity < target) return false;
      }
      if (onlyWithVulns && h.severity_count === 0) return false;
      if (query) {
        const blob = `${h.target} ${h.id} ${Object.entries(h.summary).join(" ")}`.toLowerCase();
        if (!blob.includes(query)) return false;
      }
      return true;
    });
  }, [history, q, severity, onlyWithVulns, sinceHours, mode, now]);

  const totals = useMemo(() => {
    const tot = { c: 0, h: 0, m: 0, l: 0, i: 0, total: 0, avgMs: 0 };
    let dur = 0;
    for (const h of filtered) {
      tot.c += h.summary.critical || 0;
      tot.h += h.summary.high || 0;
      tot.m += h.summary.medium || 0;
      tot.l += h.summary.low || 0;
      tot.i += h.summary.info || 0;
      tot.total += h.severity_count;
      dur += h.duration_ms || 0;
    }
    tot.avgMs = filtered.length ? Math.round(dur / filtered.length) : 0;
    return tot;
  }, [filtered]);

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Console Header */}
      <section className="studio-console-header">
        <div className="studio-title-group">
          <h1>Registro de Auditorías y Escaneos Realizados</h1>
          <p>
            Historial persistido localmente y sincronizado en tiempo real entre pestañas.
            Permite inspección forense de resultados previos, reapertura y exportación en JSON/SARIF/HTML.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="studio-badge text-emerald-400">
            <HistoryIcon size={12} /> {history.length} sesiones guardadas
          </span>
          <button className="studio-btn-secondary" onClick={() => loadFromStorage()}>
            <RefreshCw size={13} /> Sincronizar
          </button>
          <button
            className="studio-btn-secondary text-rose-400 hover:text-rose-300"
            onClick={() => setConfirmClear(true)}
            disabled={history.length === 0}
          >
            <Trash2 size={13} /> Limpiar historial
          </button>
        </div>
      </section>

      {/* Top Metrics Strip */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-[var(--studio-text-secondary)]">Total filtrado</div>
          <div className="font-display font-bold text-2xl text-white mt-1 tabular-nums">
            {filtered.length}
          </div>
        </div>
        <div className="p-3.5 rounded-[var(--radius-md)] border border-rose-900/30 bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-rose-400">Críticos</div>
          <div className="font-display font-bold text-2xl text-rose-400 mt-1 tabular-nums">
            {totals.c}
          </div>
        </div>
        <div className="p-3.5 rounded-[var(--radius-md)] border border-amber-900/30 bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-amber-400">Altos</div>
          <div className="font-display font-bold text-2xl text-amber-400 mt-1 tabular-nums">
            {totals.h}
          </div>
        </div>
        <div className="p-3.5 rounded-[var(--radius-md)] border border-yellow-900/30 bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-yellow-400">Medios</div>
          <div className="font-display font-bold text-2xl text-yellow-400 mt-1 tabular-nums">
            {totals.m}
          </div>
        </div>
        <div className="p-3.5 rounded-[var(--radius-md)] border border-emerald-900/30 bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-emerald-400">Bajos e info</div>
          <div className="font-display font-bold text-2xl text-emerald-400 mt-1 tabular-nums">
            {totals.l + totals.i}
          </div>
        </div>
        <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
          <div className="text-[11px] font-mono text-blue-400">Tiempo medio</div>
          <div className="font-display font-bold text-2xl text-blue-400 mt-1 tabular-nums">
            {totals.avgMs < 1000 ? `${totals.avgMs} ms` : `${(totals.avgMs / 1000).toFixed(2)} s`}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por archivo, objetivo o regla..."
            className="w-full studio-input !pl-9"
          />
        </div>

        <div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "all")}
            className="studio-select"
          >
            <option value="all">Cualquier severidad</option>
            <option value="critical">Crítico únicamente</option>
            <option value="high">Alto o superior</option>
            <option value="medium">Medio o superior</option>
            <option value="low">Bajo o superior</option>
          </select>
        </div>

        <div>
          <select
            value={sinceHours}
            onChange={(e) => setSinceHours(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="studio-select"
          >
            <option value="all">Cualquier fecha</option>
            <option value={1}>Última hora</option>
            <option value={24}>Últimas 24 horas</option>
            <option value={168}>Últimos 7 días</option>
          </select>
        </div>

        <div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "all" | "paste" | "files")}
            className="studio-select"
          >
            <option value="all">Cualquier origen</option>
            <option value="paste">Código pegado</option>
            <option value="files">Archivos subidos</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--studio-text-secondary)] select-none">
          <input
            type="checkbox"
            checked={onlyWithVulns}
            onChange={(e) => setOnlyWithVulns(e.target.checked)}
            className="accent-blue-500 rounded"
          />
          <span>Solo con vulnerabilidades</span>
        </label>

        {/* View mode switcher */}
        <div className="ml-auto studio-tab-group">
          <button
            onClick={() => setView("table")}
            className={`studio-tab-btn ${view === "table" ? "active" : ""}`}
          >
            Tabla
          </button>
          <button
            onClick={() => setView("list")}
            className={`studio-tab-btn ${view === "list" ? "active" : ""}`}
          >
            Fichas
          </button>
        </div>
      </section>

      {/* Table view */}
      {view === "table" && (
        <section className="studio-panel">
          <div className="overflow-x-auto">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Objetivo</th>
                  <th>Modo</th>
                  <th>Archivos</th>
                  <th>Severidad máx.</th>
                  <th className="text-right">C / A / M / B / I</th>
                  <th className="text-right">Duración</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--studio-text-secondary)]">
                      <HistoryIcon size={20} className="mx-auto mb-2 text-slate-500" />
                      <div className="font-semibold text-white">Sin registros de auditoría</div>
                      <div className="text-xs mt-0.5">Ajusta los filtros o ejecuta un nuevo análisis.</div>
                      <button
                        className="studio-btn-primary mt-3 text-xs"
                        onClick={() => navigate("/")}
                      >
                        <PlayCircle size={13} fill="currentColor" /> Ir a la consola de análisis
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => {
                    const sevMax = (h.severity_max as string) || "info";
                    return (
                      <tr key={h.id}>
                        <td className="font-mono text-xs whitespace-nowrap">
                          <div className="text-slate-200">
                            {formatDateTime(h.created_at, { seconds: true })}
                          </div>
                          <div className="text-[10px] text-[var(--studio-text-faint)] flex items-center gap-1 mt-0.5">
                            <Clock size={9} /> {formatRelative(h.created_at)}
                          </div>
                        </td>
                        <td className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <FileCode size={14} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="text-slate-100 font-semibold truncate max-w-[220px]" title={h.target}>
                                {h.target}
                              </div>
                              <div className="text-[10px] text-[var(--studio-text-faint)] font-mono">
                                {h.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="studio-badge !text-[10px]">
                            {h.mode === "paste" ? "Código" : "Archivos"}
                          </span>
                        </td>
                        <td className="font-mono text-xs">
                          {h.files} arch.
                        </td>
                        <td>
                          <span className={`studio-badge ${SEV_CLASS[sevMax] || "studio-sev-info"} !text-[10px]`}>
                            {SEV_LABEL[sevMax] || "—"}
                          </span>
                        </td>
                        <td className="text-right font-mono text-xs">
                          <span className="text-rose-400 font-bold">{h.summary.critical || 0}</span> /{" "}
                          <span className="text-amber-400 font-bold">{h.summary.high || 0}</span> /{" "}
                          <span className="text-yellow-400 font-bold">{h.summary.medium || 0}</span> /{" "}
                          <span className="text-emerald-400">{h.summary.low || 0}</span> /{" "}
                          <span className="text-slate-400">{h.summary.info || 0}</span>
                        </td>
                        <td className="text-right font-mono text-xs text-[var(--studio-text-secondary)]">
                          {h.duration_ms < 1000 ? `${h.duration_ms} ms` : `${(h.duration_ms / 1000).toFixed(2)} s`}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="studio-btn-secondary !py-0.5 !px-2 text-xs"
                              onClick={() => {
                                loadResult(h.id);
                                navigate("/");
                              }}
                              title="Cargar resultados en la consola principal"
                            >
                              Ver
                            </button>
                            <button
                              className="studio-btn-secondary !py-0.5 !px-1.5 text-xs text-rose-400 hover:text-rose-300"
                              onClick={() => deleteEntry(h.id)}
                              title="Eliminar entrada"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* List view */}
      {view === "list" && (
        <section className="grid md:grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="md:col-span-2 p-12 text-center text-[var(--studio-text-secondary)] studio-panel">
              <HistoryIcon size={20} className="mx-auto mb-2 text-slate-500" />
              <div className="font-semibold text-white">Sin registros de auditoría</div>
            </div>
          ) : (
            filtered.map((h) => {
              const sevMax = (h.severity_max as string) || "info";
              const ok = h.severity_count === 0;

              return (
                <article
                  key={h.id}
                  className="p-4 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] hover:border-[var(--studio-border-bright)] transition-colors flex flex-col justify-between"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400 shrink-0">
                        <FileCode size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-slate-100 truncate">
                          {h.target}
                        </div>
                        <div className="text-[10px] text-[var(--studio-text-secondary)] font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{formatDateTime(h.created_at, { seconds: true })}</span>
                          <span>·</span>
                          <span>{formatRelative(h.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`studio-badge ${SEV_CLASS[sevMax] || "studio-sev-info"} !text-[10px]`}>
                      {SEV_LABEL[sevMax] || "—"}
                    </span>
                  </header>

                  {/* Summary row */}
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] my-3">
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-rose-900/30 p-1 text-rose-400">
                      <div className="font-bold text-xs">{h.summary.critical || 0}</div>
                      <div>Crit</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-amber-900/30 p-1 text-amber-400">
                      <div className="font-bold text-xs">{h.summary.high || 0}</div>
                      <div>Alto</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-yellow-900/30 p-1 text-yellow-400">
                      <div className="font-bold text-xs">{h.summary.medium || 0}</div>
                      <div>Med</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-emerald-900/30 p-1 text-emerald-400">
                      <div className="font-bold text-xs">{h.summary.low || 0}</div>
                      <div>Bajo</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] p-1 text-slate-400">
                      <div className="font-bold text-xs">{h.summary.info || 0}</div>
                      <div>Info</div>
                    </div>
                  </div>

                  <footer className="pt-2.5 border-t border-[var(--studio-border)] flex items-center justify-between gap-2">
                    <div className="text-[11px] text-[var(--studio-text-secondary)] font-mono">
                      {h.files} archivos · {h.duration_ms} ms · {ok ? "Limpio" : `${h.severity_count} hallazgos`}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="studio-btn-secondary !py-1 !px-2 text-xs"
                        onClick={() => {
                          loadResult(h.id);
                          navigate("/");
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        className="studio-btn-secondary !py-1 !px-1.5 text-xs text-rose-400 hover:text-rose-300"
                        onClick={() => deleteEntry(h.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="p-5 rounded-[var(--radius-md)] border border-rose-900/50 bg-[#0c1019] max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-rose-950/60 border border-rose-800/60 grid place-items-center text-rose-400 shrink-0">
                <Trash2 size={16} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-base text-white">
                  Vaciar registro histórico
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Se eliminarán permanentemente los <b className="text-white font-mono">{history.length}</b> registros de auditoría locales.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--studio-border)]">
              <button className="studio-btn-secondary text-xs" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button
                className="studio-btn-primary !bg-rose-600 hover:!bg-rose-700 text-xs"
                onClick={() => {
                  clearHistory();
                  setConfirmClear(false);
                }}
              >
                Eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
