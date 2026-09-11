import { useEffect, useMemo, useState } from "react";
import { useSastStore } from "../store/sast";
import type { HistoryEntry } from "../types";
import {
  Download,
  FileJson,
  FileText,
  FileImage,
  Search,
  BarChart3,
  CalendarRange,
  FilterX,
  FileCode,
  TrendingUp,
  Shield,
  AlertTriangle,
  ShieldCheck,
  FileWarning,
} from "lucide-react";
import { formatDateTime, formatRelative, formatDate, parseDate } from "../lib/datetime";
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
        const wk = new Date(d);
        const day = wk.getDay() || 7;
        wk.setDate(wk.getDate() + 4 - day);
        const yearStart = new Date(wk.getFullYear(), 0, 1);
        const week = Math.ceil(((wk.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        key = `${wk.getFullYear()}-W${week}`;
      }
      const arr = map.get(key) || [];
      arr.push(h);
      map.set(key, arr);
    }
    const out = [...map.entries()]
      .map(([key, list]) => {
        let crit = 0;
        let high = 0;
        let med = 0;
        let findings = 0;
        for (const h of list) {
          crit += h.summary.critical || 0;
          high += h.summary.high || 0;
          med += h.summary.medium || 0;
          findings += h.severity_count;
        }
        const label =
          list[0] && groupBy === "day" ? formatDate(list[0].created_at) : key;
        return { key, label, entries: list, crit, high, med, findings };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
    return out;
  }, [entries, groupBy]);

  // Export aggregated JSON report
  const exportAggregateJson = () => {
    const stamp = new Date();
    const data = {
      generated_at: stamp.toISOString(),
      generated_at_local: formatDateTime(stamp, { seconds: true }),
      filters: {
        q,
        minVulns,
        format,
        groupBy,
        match_entries: entries.length,
      },
      metrics,
      timeline: grouped.map((g) => ({
        bucket: g.key,
        label: g.label,
        samples: g.entries.length,
        critical: g.crit,
        high: g.high,
        medium: g.med,
        findings_total: g.findings,
      })),
      entries: entries.map((h) => ({
        id: h.id,
        created_at: h.created_at,
        target: h.target,
        mode: h.mode,
        files: h.files,
        duration_ms: h.duration_ms,
        severity_max: h.severity_max,
        summary: h.summary,
        filters_applied: h.result.filters_applied,
        findings_count: h.severity_count,
      })),
    };
    const safe = (n: string) => n.replace(/[^a-z0-9._-]+/gi, "_");
    const stampStr = new Date().toISOString();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const sDate = new Date();
    const filename =
      `sast-report_aggregate_${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}_` +
      `${pad(sDate.getHours())}-${pad(sDate.getMinutes())}-${pad(sDate.getSeconds())}.json`;
    const blob = JSON.stringify(data, null, 2);
    const b64 =
      typeof window !== "undefined"
        ? btoa(unescape(encodeURIComponent(blob)))
        : "";
    if (typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = `data:application/json;charset=utf-8;base64,${b64}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // silence unused safe
    void safe;
    void stampStr;
  };

  const maxBar = Math.max(
    1,
    ...grouped.map((g) => Math.max(g.crit + g.high + g.med + 1, g.findings)),
  );

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-title mb-2">Reportes · precisos con marca de tiempo</div>
          <h1 className="section-title">Panel de reportes agregados</h1>
          <p className="mt-2 text-[15px] text-surface-500 max-w-2xl leading-relaxed">
            Métricas acumuladas, timeline por día / semana y reporte agregado exportable.
            Todos los datos incluyen fecha y hora exactas (UTC convertido a tu zona local).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip chip-blue inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" /> Live sync
          </span>
          <button className="btn-primary" onClick={exportAggregateJson}>
            <Download size={14} /> Reporte agregado (JSON)
          </button>
        </div>
      </header>

      {/* Top KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="stat-card bg-white border-primary-100">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 grid place-items-center text-primary-700">
              <BarChart3 size={14} />
            </div>
            <TrendingUp size={12} className="text-primary-600" />
          </div>
          <div className="text-[12px] font-semibold text-surface-500 mt-2">Análisis</div>
          <div className="font-display font-bold text-2xl text-surface-900">{metrics.totalEntries}</div>
        </div>
        <div className="stat-card bg-white border-danger-100">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-danger-50 border border-danger-100 grid place-items-center text-danger-600">
              <AlertTriangle size={14} />
            </div>
            <span className="chip chip-red">{metrics.critical} crit</span>
          </div>
          <div className="text-[12px] font-semibold text-surface-500 mt-2">Hallazgos totales</div>
          <div className="font-display font-bold text-2xl text-danger-700">{metrics.totalFindings}</div>
        </div>
        <div className="stat-card bg-white border-warning-100">
          <div className="text-[12px] font-semibold text-surface-500">Críticos</div>
          <div className="font-display font-bold text-2xl text-warning-700 mt-1">{metrics.critical}</div>
        </div>
        <div className="stat-card bg-white border-[#fde68a]">
          <div className="text-[12px] font-semibold text-surface-500">Altos</div>
          <div className="font-display font-bold text-2xl text-[#b45309] mt-1">{metrics.high}</div>
        </div>
        <div className="stat-card bg-white border-success-100">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-success-50 border border-success-100 grid place-items-center text-success-700">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="text-[12px] font-semibold text-surface-500 mt-2">Limpios</div>
          <div className="font-display font-bold text-2xl text-success-700 mt-1">
            {metrics.clean}
            <span className="text-[13px] ml-1 text-surface-500 font-semibold">
              ({metrics.cleanRate.toFixed(0)}%)
            </span>
          </div>
        </div>
        <div className="stat-card bg-white border-primary-100">
          <div className="text-[12px] font-semibold text-surface-500">Promedio por análisis</div>
          <div className="font-display font-bold text-2xl text-primary-700 mt-1">
            {metrics.avgFindings.toFixed(1)}
            <span className="text-[12px] ml-1 text-danger-600 font-semibold">
              ({metrics.avgCritical.toFixed(1)} crit)
            </span>
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
            placeholder="Buscar en reportes..."
            className="input-field pl-10"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">Mín. vulnerabilidades</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={minVulns}
            onChange={(e) => setMinVulns(Math.max(0, Number(e.target.value) || 0))}
            className="input-field !w-[160px] !py-2"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">Agrupar timeline</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "day" | "week")}
            className="input-field !py-2"
          >
            <option value="day">Por día</option>
            <option value="week">Por semana</option>
          </select>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-surface-600 block mb-1.5">Soporte formato</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="input-field !py-2"
          >
            <option value="all">Todos</option>
            <option value="json">Solo JSON</option>
            <option value="sarif">Con SARIF</option>
            <option value="html">Con HTML</option>
          </select>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setQ("");
            setMinVulns(0);
            setFormat("all");
          }}
        >
          <FilterX size={14} /> Limpiar filtros
        </button>
      </section>

      {/* Timeline chart */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="label-title mb-1">Timeline</div>
            <h2 className="font-display font-bold text-[20px] text-surface-900 leading-tight">
              Evolución de vulnerabilidades
            </h2>
            <div className="text-[12px] text-surface-500 mt-0.5">
              Agrupado <b className="text-surface-700">{groupBy === "day" ? "por día" : "por semana"}</b>.
              Colores según severidad.
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px] font-semibold text-surface-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-danger-500" /> Crítico
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-warning-500" /> Alto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#eab308]" /> Medio
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-surface-300" /> Hallazgos totales
            </span>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-50 border border-surface-200 grid place-items-center text-surface-400 mb-3">
              <Shield size={24} />
            </div>
            <div className="font-display font-bold text-surface-800 text-lg">
              Sin datos que mostrar
            </div>
            <div className="mt-1 text-[13px] text-surface-500">
              Ejecuta un análisis o ajusta los filtros actuales.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((g) => {
              const pCrit = (g.crit / maxBar) * 100;
              const pHigh = (g.high / maxBar) * 100;
              const pMed = (g.med / maxBar) * 100;
              const pAll = (g.findings / maxBar) * 100;
              return (
                <div key={g.key} className="group">
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <CalendarRange size={12} className="text-surface-400" />
                      <span className="font-semibold text-surface-700">{g.label}</span>
                      <span className="chip chip-gray !py-0.5">
                        {g.entries.length} anális{g.entries.length === 1 ? "" : "es"}
                      </span>
                    </div>
                    <div className="font-mono text-surface-600">
                      <span className="text-danger-600 font-bold">{g.crit}</span> ·{" "}
                      <span className="text-warning-700 font-bold">{g.high}</span> ·{" "}
                      <span className="text-[#a16207] font-bold">{g.med}</span> ·{" "}
                      <span className="text-surface-700 font-bold">∑ {g.findings}</span>
                    </div>
                  </div>
                  <div className="relative h-10 rounded-xl bg-surface-50 border border-surface-200 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-surface-200/70 rounded-l-xl" style={{ width: `${Math.min(100, pAll)}%` }} />
                    <div
                      className="absolute bottom-0 left-0 h-1/3 bg-danger-500/90 rounded-l"
                      style={{ width: `${Math.min(100, pCrit)}%` }}
                    />
                    <div
                      className="absolute bottom-1/3 left-0 h-1/3 bg-warning-500/90"
                      style={{ width: `${Math.min(100, pHigh)}%` }}
                    />
                    <div
                      className="absolute top-0 left-0 h-1/3 bg-[#eab308]/90 rounded-tl"
                      style={{ width: `${Math.min(100, pMed)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Individual reports list */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="label-title mb-1">Detalles</div>
            <h2 className="font-display font-bold text-[20px] text-surface-900 leading-tight">
              Reportes individuales
            </h2>
            <div className="text-[12px] text-surface-500 mt-0.5">
              Cada reporte es exportable en sus formatos disponibles y mantiene la precisión de filtros y fecha.
            </div>
          </div>
          <span className="chip chip-blue">
            {entries.length} reporte{entries.length === 1 ? "" : "s"}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-50 border border-surface-200 grid place-items-center text-surface-400 mb-3">
              <FileWarning size={24} />
            </div>
            <div className="font-display font-bold text-surface-800 text-lg mb-1">
              Sin reportes disponibles
            </div>
            <div className="text-[13px] text-surface-500 mb-4">
              Realiza análisis con las opciones "incluir SARIF / HTML" desde la configuración.
            </div>
            <button className="btn-primary" onClick={() => nav("/")}>
              Ir a Inicio
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {entries.map((h) => (
              <article
                key={h.id}
                className="rounded-2xl p-4 border border-surface-200 bg-white hover:shadow-card transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 shrink-0">
                    <FileCode size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-[15px] text-surface-900 truncate">
                      {h.target}
                    </div>
                    <div className="text-[11px] text-surface-500 font-mono truncate mt-0.5">
                      ID {h.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {h.result.sarif ? (
                      <span className="chip chip-green !py-0.5 text-[10px]">SARIF</span>
                    ) : null}
                    {h.result.html_report ? (
                      <span className="chip chip-purple !py-0.5 text-[10px]">HTML</span>
                    ) : null}
                    <span className="chip chip-blue !py-0.5 text-[10px]">JSON</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[11px]">
                  <div className="rounded-lg bg-danger-50 border border-danger-100 py-1.5">
                    <div className="font-bold text-danger-700 text-[13px]">{h.summary.critical || 0}</div>
                    <div className="text-danger-600 font-bold">C</div>
                  </div>
                  <div className="rounded-lg bg-warning-50 border border-warning-100 py-1.5">
                    <div className="font-bold text-warning-700 text-[13px]">{h.summary.high || 0}</div>
                    <div className="text-warning-600 font-bold">A</div>
                  </div>
                  <div className="rounded-lg bg-[#fef9c3] border border-[#fde68a] py-1.5">
                    <div className="font-bold text-[#854d0e] text-[13px]">{h.summary.medium || 0}</div>
                    <div className="text-[#a16207] font-bold">M</div>
                  </div>
                  <div className="rounded-lg bg-success-50 border border-success-100 py-1.5">
                    <div className="font-bold text-success-700 text-[13px]">{h.summary.low || 0}</div>
                    <div className="text-success-600 font-bold">B</div>
                  </div>
                  <div className="rounded-lg bg-primary-50 border border-primary-100 py-1.5">
                    <div className="font-bold text-primary-700 text-[13px]">{h.summary.info || 0}</div>
                    <div className="text-primary-600 font-bold">I</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-surface-500 leading-tight">
                    <div>
                      <span className="text-surface-700 font-semibold">
                        {formatDateTime(h.created_at, { seconds: true })}
                      </span>
                    </div>
                    <div className="mt-0.5">{formatRelative(h.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Exportar JSON"
                      onClick={() => exportEntry(h.id, "json")}
                      className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                    >
                      <FileJson size={13} />
                    </button>
                    <button
                      title="Exportar SARIF"
                      onClick={() => exportEntry(h.id, "sarif")}
                      disabled={!h.result.sarif}
                      className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                    >
                      <FileText size={13} />
                    </button>
                    <button
                      title="Exportar HTML"
                      onClick={() => exportEntry(h.id, "html")}
                      disabled={!h.result.html_report}
                      className="btn-secondary !py-1.5 !px-2.5 text-[12px]"
                    >
                      <FileImage size={13} />
                    </button>
                  </div>
                </div>
                {/* Filtros aplicados precisos */}
                {h.result.filters_applied && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {typeof h.result.filters_applied.min_confidence === "number" && (
                      <span className="chip chip-gray !py-0.5 text-[10px]">
                        conf ≥ {Math.round(h.result.filters_applied.min_confidence * 100)}%
                      </span>
                    )}
                    {h.result.filters_applied.min_severity && (
                      <span className="chip chip-amber !py-0.5 text-[10px]">
                        sev ≥ {h.result.filters_applied.min_severity}
                      </span>
                    )}
                    <span
                      className={`chip !py-0.5 text-[10px] ${
                        h.result.filters_applied.exclude_tests ? "chip-blue" : "chip-green"
                      }`}
                    >
                      tests: {h.result.filters_applied.exclude_tests ? "excluidos" : "incluidos"}
                    </span>
                    {h.result.filters_applied.include_sarif && (
                      <span className="chip chip-green !py-0.5 text-[10px]">sarif incluido</span>
                    )}
                    {h.result.filters_applied.include_html && (
                      <span className="chip chip-purple !py-0.5 text-[10px]">html incluido</span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
