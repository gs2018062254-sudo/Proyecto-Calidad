import { useEffect, useMemo, useState } from "react";
import { useSastStore } from "../store/sast";
import type { HistoryEntry, Severity } from "../types";
import {
  Search,
  History as HistoryIcon,
  Clock,
  FileCode,
  Trash2,
  FileJson,
  FileText,
  FileImage,
  FolderOpen,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  PlayCircle,
  X as XIcon,
} from "lucide-react";
import { formatDateTime, formatRelative, parseDate } from "../lib/datetime";
import { useNavigate } from "react-router-dom";

const SEV_STYLE: Record<string, string> = {
  critical: "chip-red",
  high: "chip-amber",
  medium: "chip-amber",
  low: "chip-green",
  info: "chip-blue",
  all: "chip-gray",
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
  const exportEntry = useSastStore((s) => s.exportHistoryEntry);
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
    <div className="max-w-[1500px] mx-auto space-y-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-title mb-2">Historial · en vivo</div>
          <h1 className="section-title">Todos los análisis</h1>
          <p className="mt-2 text-[15px] text-surface-500 max-w-2xl leading-relaxed">
            Se actualiza en tiempo real en todas las pestañas y dispositivos mediante BroadcastChannel.
            Cada entrada contiene el resumen, los filtros aplicados y el resultado completo descargable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip chip-green ${history.length ? "" : "opacity-60"}`}>
            <HistoryIcon size={12} /> {history.length} registros
          </span>
          <span className="chip chip-blue inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" />
            Live
          </span>
          <button className="btn-secondary" onClick={() => loadFromStorage()}>
            <RefreshCw size={14} /> Refrescar
          </button>
          <button
            className="btn-secondary text-danger-600 border-danger-200 hover:bg-danger-50"
            onClick={() => setConfirmClear(true)}
            disabled={history.length === 0}
          >
            <Trash2 size={14} /> Limpiar
          </button>
        </div>
      </header>

      {/* Stats summary */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="stat-card bg-white border-surface-200">
          <div className="text-[12px] font-semibold text-surface-500">Análisis</div>
          <div className="font-display font-bold text-2xl mt-1 text-surface-900">{filtered.length}</div>
        </div>
        <div className="stat-card bg-white border-danger-100">
          <div className="text-[12px] font-semibold text-danger-600">Críticos</div>
          <div className="font-display font-bold text-2xl mt-1 text-danger-700">{totals.c}</div>
        </div>
        <div className="stat-card bg-white border-warning-100">
          <div className="text-[12px] font-semibold text-warning-600">Altos</div>
          <div className="font-display font-bold text-2xl mt-1 text-warning-700">{totals.h}</div>
        </div>
        <div className="stat-card bg-white border-[#fde68a]">
          <div className="text-[12px] font-semibold text-[#b45309]">Medios</div>
          <div className="font-display font-bold text-2xl mt-1 text-[#92400e]">{totals.m}</div>
        </div>
        <div className="stat-card bg-white border-success-100">
          <div className="text-[12px] font-semibold text-success-700">Bajos + Info</div>
          <div className="font-display font-bold text-2xl mt-1 text-success-700">
            {totals.l + totals.i}
          </div>
        </div>
        <div className="stat-card bg-white border-primary-100">
          <div className="text-[12px] font-semibold text-primary-700">Tiempo medio</div>
          <div className="font-display font-bold text-2xl mt-1 text-primary-700">
            {totals.avgMs < 1000 ? `${totals.avgMs} ms` : `${(totals.avgMs / 1000).toFixed(2)} s`}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="card p-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, ID o severidades..."
            className="input-field pl-10"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">Modo</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "all" | "paste" | "files")}
            className="input-field !py-2"
          >
            <option value="all">Todos</option>
            <option value="paste">Pegar código</option>
            <option value="files">Subir archivos</option>
          </select>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">
            Severidad mínima
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "all")}
            className="input-field !py-2"
          >
            <option value="all">Todos</option>
            <option value="info">Info+</option>
            <option value="low">Bajo+</option>
            <option value="medium">Medio+</option>
            <option value="high">Alto+</option>
            <option value="critical">Solo críticos</option>
          </select>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">
            Rango tiempo
          </label>
          <select
            value={String(sinceHours)}
            onChange={(e) =>
              setSinceHours(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="input-field !py-2"
          >
            <option value="all">Todo el tiempo</option>
            <option value="1">Última hora</option>
            <option value="6">Últimas 6 h</option>
            <option value="24">Últimas 24 h</option>
            <option value="168">Últimos 7 días</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none px-2">
          <input
            type="checkbox"
            checked={onlyWithVulns}
            onChange={(e) => setOnlyWithVulns(e.target.checked)}
            className="w-4 h-4 accent-primary-600"
          />
          <span className="text-[13px] font-semibold text-surface-700">Con vulnerabilidades</span>
        </label>
        <div className="ml-auto flex items-center gap-1 bg-surface-50 rounded-xl border border-surface-200 p-1">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
              view === "table"
                ? "bg-white text-primary-700 shadow-soft"
                : "text-surface-500 hover:text-surface-800"
            }`}
          >
            Tabla
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
              view === "list"
                ? "bg-white text-primary-700 shadow-soft"
                : "text-surface-500 hover:text-surface-800"
            }`}
          >
            Lista
          </button>
        </div>
      </section>

      {/* Table view */}
      {view === "table" && (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Fecha / Hora
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Objetivo
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Modo
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Archivos
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Severidad máx
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    C / A / M / B / I
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Duración
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-50 border border-surface-200 grid place-items-center text-surface-400 mb-3">
                        <HistoryIcon size={24} />
                      </div>
                      <div className="font-display font-bold text-surface-800 text-lg">
                        Sin registros que mostrar
                      </div>
                      <div className="mt-1 text-[13px] text-surface-500">
                        Ajusta los filtros o ejecuta un nuevo análisis en Inicio.
                      </div>
                      <button
                        className="btn-primary mt-5"
                        onClick={() => navigate("/")}
                      >
                        <PlayCircle size={14} fill="currentColor" /> Ir a analizar
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-surface-100 last:border-none hover:bg-surface-50/60 transition-colors"
                    >
                      <td className="px-5 py-3 align-top">
                        <div className="text-[13px] font-semibold text-surface-800">
                          {formatDateTime(h.created_at, { seconds: true })}
                        </div>
                        <div className="text-[11px] text-surface-500 mt-0.5 inline-flex items-center gap-1">
                          <Clock size={11} /> {formatRelative(h.created_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 shrink-0">
                            <FileCode size={14} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-[13px] font-semibold text-surface-800 truncate max-w-[260px]"
                              title={h.target}
                            >
                              {h.target}
                            </div>
                            <div className="text-[11px] text-surface-500 font-mono truncate max-w-[260px]">
                              ID {h.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        {h.mode === "paste" ? (
                          <span className="chip chip-blue">Pegar</span>
                        ) : (
                          <span className="chip chip-purple">Archivos</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="text-[13px] font-semibold text-surface-800">
                          {h.files}
                        </div>
                        <div className="text-[11px] text-surface-500">archivos analizados</div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <span className={`chip ${SEV_STYLE[h.severity_max as string] || "chip-gray"}`}>
                          {SEV_LABEL[h.severity_max as string] || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <div className="inline-flex flex-wrap justify-end items-center gap-1.5 font-mono text-[12px] font-semibold">
                          <span className="px-1.5 py-0.5 rounded bg-danger-50 text-danger-700 border border-danger-100">
                            {h.summary.critical || 0}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-100">
                            {h.summary.high || 0}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] border border-[#fde68a]">
                            {h.summary.medium || 0}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-success-50 text-success-700 border border-success-100">
                            {h.summary.low || 0}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                            {h.summary.info || 0}
                          </span>
                        </div>
                        <div className="text-[11px] text-surface-500 mt-1 inline-flex items-center gap-1">
                          {h.severity_count === 0 ? (
                            <>
                              <ShieldCheck size={11} className="text-success-600" /> 0 fallos · limpio
                            </>
                          ) : h.severity_count <= 3 ? (
                            <>
                              <TrendingDown size={11} className="text-success-600" /> {h.severity_count} total
                            </>
                          ) : (
                            <>
                              <TrendingUp size={11} className="text-danger-600" /> {h.severity_count} total
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <div className="text-[13px] font-semibold text-surface-800">
                          {h.duration_ms < 1000
                            ? `${h.duration_ms} ms`
                            : `${(h.duration_ms / 1000).toFixed(2)} s`}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                            title="Cargar resultado"
                            onClick={() => {
                              loadResult(h.id);
                              navigate("/");
                            }}
                          >
                            <PlayCircle size={13} /> Cargar
                          </button>
                          <button
                            className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                            title="Exportar JSON"
                            onClick={() => exportEntry(h.id, "json")}
                          >
                            <FileJson size={13} />
                          </button>
                          <button
                            className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                            title="Exportar SARIF"
                            onClick={() => exportEntry(h.id, "sarif")}
                            disabled={!h.result.sarif}
                          >
                            <FileText size={13} />
                          </button>
                          <button
                            className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                            title="Exportar HTML"
                            onClick={() => exportEntry(h.id, "html")}
                            disabled={!h.result.html_report}
                          >
                            <FileImage size={13} />
                          </button>
                          <button
                            className="btn-secondary !py-1.5 !px-2.5 text-[12px] text-danger-600 hover:bg-danger-50 border-danger-200"
                            title="Eliminar"
                            onClick={() => deleteEntry(h.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-end gap-1.5 flex-wrap">
                          {h.result.filters_applied?.exclude_tests === false && (
                            <span className="chip chip-blue !py-0.5 !text-[10px] !px-2">
                              <FolderOpen size={10} /> incluye tests
                            </span>
                          )}
                          {h.result.filters_applied?.min_severity && (
                            <span className="chip chip-amber !py-0.5 !text-[10px] !px-2">
                              ≥ {SEV_LABEL[h.result.filters_applied.min_severity as string] || h.result.filters_applied.min_severity}
                            </span>
                          )}
                          {typeof h.result.filters_applied?.min_confidence === "number" &&
                            h.result.filters_applied.min_confidence > 0 && (
                              <span className="chip chip-gray !py-0.5 !text-[10px] !px-2">
                                conf ≥ {Math.round(h.result.filters_applied.min_confidence * 100)}%
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* List view */}
      {view === "list" && (
        <section className="grid md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="md:col-span-2 card p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-50 border border-surface-200 grid place-items-center text-surface-400 mb-3">
                <HistoryIcon size={24} />
              </div>
              <div className="font-display font-bold text-surface-800 text-lg">
                Sin registros que mostrar
              </div>
              <div className="mt-1 text-[13px] text-surface-500">
                Ajusta los filtros o ejecuta un nuevo análisis.
              </div>
            </div>
          ) : (
            filtered.map((h) => (
              <article key={h.id} className="card p-5 card-hover">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 shrink-0">
                      <FileCode size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-[15px] text-surface-900 truncate">
                        {h.target}
                      </div>
                      <div className="text-[11px] text-surface-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{formatDateTime(h.created_at, { seconds: true })}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {formatRelative(h.created_at)}
                        </span>
                        <span>·</span>
                        {h.mode === "paste" ? (
                          <span className="chip chip-blue !py-0.5">Pegar</span>
                        ) : (
                          <span className="chip chip-purple !py-0.5">Archivos</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`chip ${SEV_STYLE[h.severity_max as string] || "chip-gray"} shrink-0`}>
                    {SEV_LABEL[h.severity_max as string] || "—"}
                  </span>
                </header>

                <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
                  <div className="rounded-xl bg-danger-50 border border-danger-100 py-2">
                    <div className="text-[10px] font-bold uppercase text-danger-600 tracking-wide">
                      Crit
                    </div>
                    <div className="font-display font-bold text-danger-700 text-lg">
                      {h.summary.critical || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-warning-50 border border-warning-100 py-2">
                    <div className="text-[10px] font-bold uppercase text-warning-600 tracking-wide">
                      Alto
                    </div>
                    <div className="font-display font-bold text-warning-700 text-lg">
                      {h.summary.high || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#fef9c3] border border-[#fde68a] py-2">
                    <div className="text-[10px] font-bold uppercase text-[#92400e] tracking-wide">
                      Med
                    </div>
                    <div className="font-display font-bold text-[#854d0e] text-lg">
                      {h.summary.medium || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-success-50 border border-success-100 py-2">
                    <div className="text-[10px] font-bold uppercase text-success-700 tracking-wide">
                      Bajo
                    </div>
                    <div className="font-display font-bold text-success-700 text-lg">
                      {h.summary.low || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary-50 border border-primary-100 py-2">
                    <div className="text-[10px] font-bold uppercase text-primary-700 tracking-wide">
                      Info
                    </div>
                    <div className="font-display font-bold text-primary-700 text-lg">
                      {h.summary.info || 0}
                    </div>
                  </div>
                </div>

                <footer className="mt-4 pt-4 border-t border-surface-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] text-surface-500">
                    <b className="text-surface-700">{h.files}</b> archivos ·{" "}
                    <b className="text-surface-700">
                      {h.duration_ms < 1000 ? `${h.duration_ms} ms` : `${(h.duration_ms / 1000).toFixed(2)} s`}
                    </b>{" "}
                    · <b className="text-surface-700">{h.severity_count}</b> total
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                      onClick={() => {
                        loadResult(h.id);
                        navigate("/");
                      }}
                    >
                      <PlayCircle size={13} /> Cargar
                    </button>
                    <div className="flex items-center border border-surface-200 rounded-xl overflow-hidden">
                      <button
                        title="Exportar JSON"
                        onClick={() => exportEntry(h.id, "json")}
                        className="px-2 py-1.5 hover:bg-surface-50 text-surface-600 hover:text-primary-700 border-r border-surface-200"
                      >
                        <FileJson size={13} />
                      </button>
                      <button
                        title="Exportar SARIF"
                        onClick={() => exportEntry(h.id, "sarif")}
                        disabled={!h.result.sarif}
                        className="px-2 py-1.5 hover:bg-surface-50 text-surface-600 hover:text-primary-700 border-r border-surface-200 disabled:opacity-40"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        title="Exportar HTML"
                        onClick={() => exportEntry(h.id, "html")}
                        disabled={!h.result.html_report}
                        className="px-2 py-1.5 hover:bg-surface-50 text-surface-600 hover:text-primary-700 disabled:opacity-40"
                      >
                        <FileImage size={13} />
                      </button>
                    </div>
                    <button
                      className="btn-secondary !py-1.5 !px-2.5 text-[12px] text-danger-600 hover:bg-danger-50 border-danger-200"
                      onClick={() => deleteEntry(h.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </footer>
              </article>
            ))
          )}
        </section>
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-up">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-danger-50 border border-danger-200 grid place-items-center text-danger-600 shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-[17px] text-surface-900 leading-tight">
                  Borrar todo el historial
                </h3>
                <p className="mt-1 text-[13px] text-surface-500">
                  Esta acción no se puede deshacer. Se eliminarán{" "}
                  <b className="text-surface-800">{history.length}</b> registros de tu equipo.
                </p>
              </div>
              <button
                onClick={() => setConfirmClear(false)}
                className="w-8 h-8 rounded-lg grid place-items-center text-surface-400 hover:bg-surface-50 hover:text-surface-700"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", boxShadow: "0 10px 24px -10px rgba(220,38,38,0.5)" }}
                onClick={() => {
                  clearHistory();
                  setConfirmClear(false);
                }}
              >
                <Trash2 size={14} /> Sí, eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
