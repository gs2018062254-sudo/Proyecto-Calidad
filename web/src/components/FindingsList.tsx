import { useSastStore, buildFindingKey } from "../store/sast";
import { SEVERITY_INFO, confidenceColor, severityOrder } from "../lib/severity";
import type { FindingDto, Severity } from "../types";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  FileJson,
  FileCode,
  FileText,
  ExternalLink,
  ArrowRight,
  CalendarDays,
  Clock,
} from "lucide-react";
import { formatDateTime, formatTime } from "../lib/datetime";

const SEV_CHIP: Record<string, string> = {
  critical: "chip-red",
  high: "chip-amber",
  medium: "chip-amber",
  low: "chip-green",
  info: "chip-blue",
};
const SEV_STYLE_BG: Record<string, string> = {
  critical: "#fee2e2",
  high: "#fef3c7",
  medium: "#fef9c3",
  low: "#d1fae5",
  info: "#dbeafe",
};

export default function FindingsList() {
  const result = useSastStore((s) => s.result);
  const expandedKey = useSastStore((s) => s.expandedFindingId);
  const toggleExpand = useSastStore((s) => s.toggleExpand);
  const activeFilter = useSastStore((s) => s.activeSeverityFilter);
  const setActiveFilter = useSastStore((s) => s.setActiveSeverity);
  const activeFile = useSastStore((s) => s.activeFile);
  const setActiveFile = useSastStore((s) => s.setActiveFile);
  const exportJson = useSastStore((s) => s.exportJson);
  const exportSarif = useSastStore((s) => s.exportSarif);
  const exportHtml = useSastStore((s) => s.exportHtml);

  if (!result) return null;

  const allFiles = Object.keys(result.sources || {});
  const rawFindings = Array.isArray(result.findings) ? result.findings : [];

  const filtered: FindingDto[] = rawFindings
    .filter((f) => {
      if (!f) return false;
      if (activeFilter !== "all" && f.severity !== activeFilter) return false;
      if (activeFile && f.file_path !== activeFile) return false;
      return true;
    })
    .sort((a, b) => {
      const sA = severityOrder((a?.severity ?? "info") as any) || 0;
      const sB = severityOrder((b?.severity ?? "info") as any) || 0;
      const cA = typeof a?.confidence === "number" ? a.confidence : 0;
      const cB = typeof b?.confidence === "number" ? b.confidence : 0;
      return sA - sB || cB - cA;
    });

  const filters: { value: Severity | "all"; label: string; emoji: string; color: string }[] = [
    { value: "all", label: "Todos", emoji: "🛡️", color: "#64748b" },
    { value: "critical", label: "Crítico", emoji: "🔴", color: "#dc2626" },
    { value: "high", label: "Alto", emoji: "🟠", color: "#b45309" },
    { value: "medium", label: "Medio", emoji: "🟡", color: "#a16207" },
    { value: "low", label: "Bajo", emoji: "🟢", color: "#047857" },
    { value: "info", label: "Info", emoji: "🔵", color: "#1d4ed8" },
  ];

  const timeOfScan = result.timestamp;

  return (
    <div className="card p-5 space-y-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="chip chip-gray inline-flex items-center gap-1.5">
            <Filter size={12} /> Filtros
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => {
              const active = activeFilter === f.value;
              const styleBtn: React.CSSProperties = active
                ? { color: f.color, borderColor: `${f.color}66`, background: `${f.color}14` }
                : {};
              const count =
                f.value === "all"
                  ? rawFindings.length
                  : rawFindings.filter((x) => x?.severity === f.value).length;
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value as Severity)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition border flex items-center gap-1",
                    active
                      ? "shadow-soft"
                      : "bg-white border-surface-200 text-surface-500 hover:bg-surface-50 hover:text-surface-800",
                  )}
                  style={styleBtn}
                >
                  <span>{f.emoji}</span>
                  {f.label}
                  <span className="opacity-70 ml-0.5 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {timeOfScan && (
            <span className="chip chip-blue inline-flex items-center gap-1.5" title={formatDateTime(timeOfScan, { seconds: true })}>
              <CalendarDays size={11} />
              {formatTime(timeOfScan)}
            </span>
          )}
          {allFiles.length > 1 && (
            <select
              value={activeFile}
              onChange={(e) => setActiveFile(e.target.value)}
              className="input-field !py-2 !w-auto min-w-[200px] text-[13px]"
            >
              <option value="">Todos los archivos</option>
              {allFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            <button
              className="btn-secondary !py-1.5 !px-2.5 text-xs"
              onClick={exportJson}
              title="Exportar JSON"
            >
              <FileJson size={13} /> JSON
            </button>
            <button
              className="btn-secondary !py-1.5 !px-2.5 text-xs"
              onClick={exportSarif}
              title="Exportar SARIF 2.1"
            >
              <FileCode size={13} /> SARIF
            </button>
            <button
              className="btn-secondary !py-1.5 !px-2.5 text-xs"
              onClick={exportHtml}
              title="Exportar reporte HTML standalone"
            >
              <FileText size={13} /> HTML
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-success-50 border border-success-100 grid place-items-center text-success-600 mb-3">
            ✨
          </div>
          <div className="font-display font-semibold text-surface-800 text-lg">
            No se encontraron hallazgos con estos filtros.
          </div>
          <div className="text-[13px] text-surface-500 mt-1">
            Intenta reducir la severidad mínima o la confianza.
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-auto scrollbar-thin pr-1">
          {filtered.map((f, idx) => {
            const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
              color: "#64748b",
              emoji: "ℹ️",
              labelEs: "Info",
            };
            const key = buildFindingKey(f, idx);
            const expanded = expandedKey === key;
            return (
              <div
                key={key}
                className={clsx(
                  "rounded-xl border overflow-hidden transition-all bg-white hover:shadow-soft",
                )}
                style={{
                  borderColor: SEV_STYLE_BG[f.severity] ?? "#e2e8f0",
                  borderLeftWidth: 4,
                  borderLeftColor: sev.color,
                }}
              >
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-50 transition"
                  onClick={() => toggleExpand(key)}
                >
                  <div className="mt-0.5">
                    {expanded ? (
                      <ChevronDown size={16} className="text-surface-400" />
                    ) : (
                      <ChevronRight size={16} className="text-surface-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`chip ${SEV_CHIP[f.severity] || "chip-gray"} !py-0.5`}>
                        {sev.emoji} {sev.labelEs}
                      </span>
                      <span className="font-display font-semibold text-surface-800 text-[14px]">
                        {f.title}
                      </span>
                      <span className="ml-auto text-[11px] font-mono text-surface-400">
                        {f.rule_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[12px] flex-wrap">
                      <span className="text-surface-500">
                        <span className="text-surface-700 font-semibold">{f.file_path}</span>:
                        <span className="text-primary-700 font-mono font-bold"> L{f.line}</span>
                        {f.column ? (
                          <span className="text-surface-400 font-mono">
                            :C{f.column}
                          </span>
                        ) : null}
                      </span>
                      {timeOfScan && (
                        <span className="text-surface-400 inline-flex items-center gap-1" title={formatDateTime(timeOfScan, { seconds: true })}>
                          <Clock size={11} />
                          Línea · {formatTime(timeOfScan)}
                        </span>
                      )}
                      {f.cwe && (
                        <a
                          href={`https://cwe.mitre.org/data/definitions/${f.cwe.replace(
                            "CWE-",
                            "",
                          )}.html`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-surface-500 hover:text-primary-700 transition font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.cwe} <ExternalLink size={10} />
                        </a>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(f.confidence * 100)}%`,
                              background: confidenceColor(f.confidence),
                            }}
                          />
                        </div>
                        <span
                          className="font-mono font-bold text-[11px]"
                          style={{ color: confidenceColor(f.confidence) }}
                        >
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-surface-100 animate-fade-up">
                    <FindingDetail f={f} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FindingDetail({ f }: { f: FindingDto }) {
  const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
    color: "#64748b",
    emoji: "ℹ️",
    labelEs: "Info",
  };
  const owaspClean = (f.owasp || "").toString().split("-")[0];
  return (
    <div className="space-y-3 pt-3">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-surface-500 font-bold mb-1.5">
          Descripción
        </div>
        <p className="text-[14px] text-surface-700 leading-relaxed">
          {f.description || "Sin descripción."}
        </p>
      </div>

      {f.evidence && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-surface-500 font-bold mb-1.5">
            Evidencia (L{f.line})
          </div>
          <pre
            className="code-line rounded-lg p-3 bg-surface-50 border border-surface-200 overflow-auto"
            style={{
              boxShadow: `inset 3px 0 0 ${sev.color}`,
            }}
          >
            <code>{f.evidence}</code>
          </pre>
        </div>
      )}

      {f.data_flow && Array.isArray(f.data_flow) && f.data_flow.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-surface-500 font-bold mb-1.5">
            Flujo de datos (Taint Analysis)
          </div>
          <ol className="space-y-1.5">
            {f.data_flow.map((step, i) => {
              const safeStep = step ?? { step: i + 1, line: "?", variable: "" };
              return (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-surface-50 border border-surface-200 px-3 py-2"
                >
                  <div
                    className="w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold shrink-0 text-white"
                    style={{ background: sev.color }}
                  >
                    {safeStep.step ?? i + 1}
                  </div>
                  <div className="min-w-0 flex-1 text-[13px]">
                    <span className="text-primary-700 font-mono font-bold">
                      {safeStep.variable ?? "—"}
                    </span>
                    <span className="text-surface-400 mx-1.5">
                      <ArrowRight size={12} className="inline" />
                    </span>
                    <span className="text-surface-600">
                      línea{" "}
                      <span className="font-mono text-primary-700 font-bold">
                        {safeStep.line ?? "?"}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-widest text-surface-500 font-bold mb-1.5">
          Recomendación
        </div>
        <p className="text-[14px] text-success-700 leading-relaxed bg-success-50/60 border border-success-100 rounded-xl p-3">
          💡 {f.recommendation || "Sin recomendación."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {owaspClean && <span className="chip chip-purple">OWASP · {owaspClean}</span>}
        {f.source && <span className="chip chip-blue">Source: {f.source}</span>}
        {f.sink && <span className="chip chip-amber">Sink: {f.sink}</span>}
      </div>
    </div>
  );
}
