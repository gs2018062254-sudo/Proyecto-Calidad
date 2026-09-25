import { useEffect, useMemo, useState } from "react";
import { useSastStore } from "../store/sast";
import type { HistoryEntry } from "../types";
import {
  Download,
  FileJson,
  FileText,
  FileImage,
  Search,
  CalendarRange,
  FilterX,
  FileCode,
  TrendingUp,
  Shield,
  AlertTriangle,
  ShieldCheck,
  FileWarning,
} from "lucide-react";
import { formatDateTime, formatDate, parseDate } from "../lib/datetime";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const history = useSastStore((s) => s.history);
  const load = useSastStore((s) => s.loadHistoryFromStorage);
  const exportEntry = useSastStore((s) => s.exportHistoryEntry);
  const nav = useNavigate();
  useEffect(() => {
    load();
  }, [load]);

  const [q, setQ] = useState("");
  const [minVulns, setMinVulns] = useState<number>(0);
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");
  const [format, setFormat] = useState<"all" | "json" | "sarif" | "html">("all");

  const entries = useMemo<HistoryEntry[]>(() => {
    const query = q.trim().toLowerCase();
    return history
      .filter((h) => {
        if (h.severity_count < minVulns) return false;
        if (format !== "all") {
          if (format === "sarif" && !h.result.sarif) return false;
          if (format === "html" && !h.result.html_report) return false;
        }
        if (query) {
          const blob = `${h.target} ${Object.entries(h.summary).join(" ")}`.toLowerCase();
          if (!blob.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ta = parseDate(a.created_at)?.getTime() ?? 0;
        const tb = parseDate(b.created_at)?.getTime() ?? 0;
        return tb - ta;
      });
  }, [history, q, minVulns, format]);

  // Metrics
  const metrics = useMemo(() => {
    const totalEntries = entries.length;
    let totalFindings = 0;
    let critical = 0;
    let high = 0;
    let med = 0;
    let clean = 0;
    for (const h of entries) {
      const n = h.severity_count;
      totalFindings += n;
      critical += h.summary.critical || 0;
      high += h.summary.high || 0;
      med += h.summary.medium || 0;
      if (n === 0) clean++;
    }
    const avgFindings = totalEntries ? totalFindings / totalEntries : 0;
    const avgCritical = totalEntries ? critical / totalEntries : 0;
    const cleanRate = totalEntries ? (clean / totalEntries) * 100 : 0;
    return {
      totalEntries,
      totalFindings,
      critical,
      high,
      med,
      clean,
      avgFindings,
      avgCritical,
      cleanRate,
    };
  }, [entries]);

  // Grouped chart data
  const grouped = useMemo<{ key: string; label: string; entries: HistoryEntry[]; crit: number; high: number; med: number; findings: number }[]>(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const h of entries) {
      const d = parseDate(h.created_at);
      if (!d) continue;
      let key: string;
      if (groupBy === "day") {
        key = formatDate(d);
      } else {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        key = `Semana del ${formatDate(monday)}`;
      }
      const arr = map.get(key) || [];
      arr.push(h);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      let crit = 0;
      let high = 0;
      let med = 0;
      let findings = 0;
      for (const item of list) {
        crit += item.summary.critical || 0;
        high += item.summary.high || 0;
        med += item.summary.medium || 0;
        findings += item.severity_count;
      }
      return {
        key,
        label: key,
        entries: list,
        crit,
        high,
        med,
        findings,
      };
    });
  }, [entries, groupBy]);

  const exportAggregateJson = () => {
    const safe = {
      title: "SAST Studio · Reporte Agregado",
      generated_at: new Date().toISOString(),
      metrics,
      entries_count: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        target: e.target,
        created_at: e.created_at,
        severity_count: e.severity_count,
        severity_max: e.severity_max,
        summary: e.summary,
        files: e.files,
      })),
    };
    const jsonStr = JSON.stringify(safe, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const filename = `sast_aggregate_report_${Date.now()}.json`;
    if (typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = `data:application/json;charset=utf-8;base64,${b64}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const maxBar = Math.max(
    1,
    ...grouped.map((g) => Math.max(g.crit + g.high + g.med + 1, g.findings)),
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Console Header */}
      <section className="studio-console-header">
        <div className="studio-title-group">
          <h1>Reportes y Telemetría</h1>
          <p>
            Métricas acumuladas, series temporales por periodo y descarga consolidada de auditorías.
            Registros sincronizados con marcas de tiempo UTC y visualización local.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="studio-badge text-blue-400">
            {entries.length} auditorías registradas
          </span>
          <button className="studio-btn-primary" onClick={exportAggregateJson}>
            <Download size={13} /> Exportar reporte consolidado (JSON)
          </button>
        </div>
      </section>

      {/* Top KPI Grid */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--studio-text-secondary)]">Auditorías</span>
            <TrendingUp size={12} className="text-blue-400" />
          </div>
          <div className="font-display font-bold text-2xl text-white mt-1 tabular-nums">
            {metrics.totalEntries}
          </div>
        </div>

        <div className="p-3.5 rounded-[var(--radius-md)] border border-rose-900/30 bg-[var(--studio-panel)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-400">Hallazgos</span>
            <AlertTriangle size={12} className="text-rose-400" />
          </div>
          <div className="font-display font-bold text-2xl text-rose-400 mt-1 tabular-nums">
            {metrics.totalFindings}
          </div>
        </div>

        <div className="p-3.5 rounded-[var(--radius-md)] border border-rose-900/30 bg-[var(--studio-panel)]">
          <span className="text-[11px] font-mono text-rose-300">Críticos</span>
          <div className="font-display font-bold text-2xl text-rose-300 mt-1 tabular-nums">
            {metrics.critical}
          </div>
        </div>

        <div className="p-3.5 rounded-[var(--radius-md)] border border-amber-900/30 bg-[var(--studio-panel)]">
          <span className="text-[11px] font-mono text-amber-400">Altos</span>
          <div className="font-display font-bold text-2xl text-amber-400 mt-1 tabular-nums">
            {metrics.high}
          </div>
        </div>

        <div className="p-3.5 rounded-[var(--radius-md)] border border-emerald-900/30 bg-[var(--studio-panel)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400">Código limpio</span>
            <ShieldCheck size={12} className="text-emerald-400" />
          </div>
          <div className="font-display font-bold text-2xl text-emerald-400 mt-1 tabular-nums">
            {metrics.cleanRate.toFixed(0)}%
          </div>
        </div>

        <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
          <span className="text-[11px] font-mono text-[var(--studio-text-secondary)]">Promedio / escaneo</span>
          <div className="font-display font-bold text-2xl text-blue-400 mt-1 tabular-nums">
            {metrics.avgFindings.toFixed(1)}
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre de archivo o regla..."
            className="w-full studio-input !pl-9"
          />
        </div>
        <div>
          <label className="text-[11px] text-[var(--studio-text-secondary)] block mb-1">Mín. vulnerabilidades</label>
          <input
            type="number"
            min={0}
            max={999}
            value={minVulns}
            onChange={(e) => setMinVulns(Math.max(0, Number(e.target.value) || 0))}
            className="studio-input !w-[110px]"
          />
        </div>
        <div>
          <label className="text-[11px] text-[var(--studio-text-secondary)] block mb-1">Agrupar serie</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "day" | "week")}
            className="studio-select"
          >
            <option value="day">Por día</option>
            <option value="week">Por semana</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[var(--studio-text-secondary)] block mb-1">Formato</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="studio-select"
          >
            <option value="all">Todos</option>
            <option value="json">Solo JSON</option>
            <option value="sarif">Con SARIF</option>
            <option value="html">Con HTML</option>
          </select>
        </div>
        <button
          className="studio-btn-secondary"
          onClick={() => {
            setQ("");
            setMinVulns(0);
            setFormat("all");
          }}
        >
          <FilterX size={13} /> Limpiar
        </button>
      </section>

      {/* Timeline Section */}
      <section className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="font-display font-bold text-base text-white">
              Evolución Temporal de Vulnerabilidades
            </h2>
            <div className="text-xs text-[var(--studio-text-secondary)] mt-0.5">
              Agrupado {groupBy === "day" ? "diariamente" : "semanalmente"}. Distribución por severidad.
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Crítico
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Alto
            </span>
            <span className="inline-flex items-center gap-1.5 text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Medio
            </span>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-slate-500 mb-2">
              <Shield size={18} />
            </div>
            <div className="font-display font-semibold text-sm text-slate-300">
              Sin registros para los filtros actuales
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {grouped.map((g) => {
              const pCrit = (g.crit / maxBar) * 100;
              const pHigh = (g.high / maxBar) * 100;
              const pMed = (g.med / maxBar) * 100;
              const pAll = (g.findings / maxBar) * 100;

              return (
                <div key={g.key}>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-[var(--studio-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <CalendarRange size={12} className="text-blue-400" />
                      <span className="text-slate-200 font-semibold">{g.label}</span>
                      <span className="studio-badge !text-[10px]">
                        {g.entries.length} escaneo{g.entries.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-400 font-bold">{g.crit}C</span> ·{" "}
                      <span className="text-amber-400 font-bold">{g.high}A</span> ·{" "}
                      <span className="text-yellow-400 font-bold">{g.med}M</span> ·{" "}
                      <span className="text-slate-200 font-bold">Total: {g.findings}</span>
                    </div>
                  </div>
                  <div className="relative h-4 rounded-[var(--radius-sm)] bg-slate-900 overflow-hidden border border-[var(--studio-border)]">
                    <div className="absolute inset-y-0 left-0 bg-slate-800/80" style={{ width: `${Math.min(100, pAll)}%` }} />
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-500"
                      style={{ width: `${Math.min(100, pCrit)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-500"
                      style={{ width: `${Math.min(100, pHigh)}%`, left: `${Math.min(100, pCrit)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-yellow-500"
                      style={{ width: `${Math.min(100, pMed)}%`, left: `${Math.min(100, pCrit + pHigh)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Individual Reports Grid */}
      <section className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="font-display font-bold text-base text-white">
              Reportes Individuales de Auditoría
            </h2>
            <div className="text-xs text-[var(--studio-text-secondary)] mt-0.5">
              Exportación individual en JSON, SARIF 2.1 y HTML autocontenido.
            </div>
          </div>
          <span className="studio-badge">
            {entries.length} disponibles
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-slate-500 mb-2">
              <FileWarning size={18} />
            </div>
            <div className="text-xs text-slate-400 mb-3">
              No hay reportes que coincidan con la búsqueda.
            </div>
            <button className="studio-btn-secondary" onClick={() => nav("/")}>
              Ir a la consola de análisis
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {entries.map((h) => (
              <article
                key={h.id}
                className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-surface)] hover:border-[var(--studio-border-bright)] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode size={16} className="text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-slate-100 truncate">
                          {h.target}
                        </div>
                        <div className="text-[10px] text-[var(--studio-text-faint)] font-mono truncate">
                          {h.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {h.result.sarif && (
                        <span className="studio-badge !text-[10px] text-blue-400">SARIF</span>
                      )}
                      {h.result.html_report && (
                        <span className="studio-badge !text-[10px] text-purple-400">HTML</span>
                      )}
                      <span className="studio-badge !text-[10px]">JSON</span>
                    </div>
                  </div>

                  {/* Severities counter */}
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] my-2.5">
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-rose-900/30 p-1 text-rose-400">
                      <div className="font-bold text-xs">{h.summary.critical || 0}</div>
                      <div>Crítico</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-amber-900/30 p-1 text-amber-400">
                      <div className="font-bold text-xs">{h.summary.high || 0}</div>
                      <div>Alto</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-yellow-900/30 p-1 text-yellow-400">
                      <div className="font-bold text-xs">{h.summary.medium || 0}</div>
                      <div>Medio</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-emerald-900/30 p-1 text-emerald-400">
                      <div className="font-bold text-xs">{h.summary.low || 0}</div>
                      <div>Bajo</div>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-[var(--studio-border)] p-1 text-slate-400">
                      <div className="font-bold text-xs">{h.summary.info || 0}</div>
                      <div>Info</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--studio-border)] flex items-center justify-between gap-2">
                  <div className="text-[10px] text-[var(--studio-text-secondary)] font-mono">
                    <span>{formatDateTime(h.created_at, { seconds: true })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      title="Exportar JSON"
                      onClick={() => exportEntry(h.id, "json")}
                      className="studio-btn-secondary !py-1 !px-2 text-xs"
                    >
                      <FileJson size={12} />
                    </button>
                    <button
                      title="Exportar SARIF"
                      onClick={() => exportEntry(h.id, "sarif")}
                      disabled={!h.result.sarif}
                      className="studio-btn-secondary !py-1 !px-2 text-xs disabled:opacity-30"
                    >
                      <FileText size={12} />
                    </button>
                    <button
                      title="Exportar HTML"
                      onClick={() => exportEntry(h.id, "html")}
                      disabled={!h.result.html_report}
                      className="studio-btn-secondary !py-1 !px-2 text-xs disabled:opacity-30"
                    >
                      <FileImage size={12} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
