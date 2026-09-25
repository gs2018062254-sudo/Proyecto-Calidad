import { useState } from "react";
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
  Copy,
  Check,
  Wrench,
} from "lucide-react";
import { formatDateTime, formatTime } from "../lib/datetime";

const SEV_CLASS: Record<string, string> = {
  critical: "studio-sev-critical",
  high: "studio-sev-high",
  medium: "studio-sev-medium",
  low: "studio-sev-low",
  info: "studio-sev-info",
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
  const rawFindings: FindingDto[] = Array.isArray(result.findings) ? result.findings : [];

  const filtered: FindingDto[] = rawFindings
    .filter((f: FindingDto) => {
      if (!f) return false;
      if (activeFilter !== "all" && f.severity !== activeFilter) return false;
      if (activeFile && f.file_path !== activeFile) return false;
      return true;
    })
    .sort((a: FindingDto, b: FindingDto) => {
      const sA = severityOrder((a?.severity ?? "info") as any) || 0;
      const sB = severityOrder((b?.severity ?? "info") as any) || 0;
      const cA = typeof a?.confidence === "number" ? a.confidence : 0;
      const cB = typeof b?.confidence === "number" ? b.confidence : 0;
      return sA - sB || cB - cA;
    });

  const filters: { value: Severity | "all"; label: string; color: string }[] = [
    { value: "all", label: "Todos", color: "#94a3b8" },
    { value: "critical", label: "Crítico", color: "#fda4af" },
    { value: "high", label: "Alto", color: "#fdba74" },
    { value: "medium", label: "Medio", color: "#fde047" },
    { value: "low", label: "Bajo", color: "#6ee7b7" },
    { value: "info", label: "Info", color: "#93c5fd" },
  ];

  const timeOfScan = result.timestamp;

  return (
    <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="studio-badge">
            <Filter size={11} /> Filtros
          </span>
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => {
              const active = activeFilter === f.value;
              const count =
                f.value === "all"
                  ? rawFindings.length
                  : rawFindings.filter((x: FindingDto) => x?.severity === f.value).length;
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value as Severity)}
                  className={clsx(
                    "px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition border flex items-center gap-1",
                    active
                      ? "bg-[var(--studio-surface-active)] border-blue-500/60 text-white font-semibold"
                      : "bg-[var(--studio-surface)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-slate-200",
                  )}
                >
                  {f.label}
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {timeOfScan && (
            <span className="studio-badge" title={formatDateTime(timeOfScan, { seconds: true })}>
              <CalendarDays size={11} />
              {formatTime(timeOfScan)}
            </span>
          )}
          {allFiles.length > 1 && (
            <select
              value={activeFile}
              onChange={(e) => setActiveFile(e.target.value)}
              className="studio-select !py-1 text-xs"
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
              className="studio-btn-secondary !py-1 !px-2 text-xs font-mono"
              onClick={exportJson}
              title="Exportar JSON"
            >
              <FileJson size={12} /> JSON
            </button>
            <button
              className="studio-btn-secondary !py-1 !px-2 text-xs font-mono"
              onClick={exportSarif}
              title="Exportar SARIF 2.1"
            >
              <FileCode size={12} /> SARIF
            </button>
            <button
              className="studio-btn-secondary !py-1 !px-2 text-xs font-mono"
              onClick={exportHtml}
              title="Exportar reporte HTML"
            >
              <FileText size={12} /> HTML
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 rounded-[var(--radius-md)] bg-[var(--studio-surface)] border border-[var(--studio-border)]">
          <div className="font-display font-semibold text-white text-sm">
            Sin hallazgos para los filtros seleccionados
          </div>
          <div className="text-xs text-[var(--studio-text-secondary)] mt-1">
            Ajusta los filtros de severidad o confianza en el panel lateral.
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {filtered.map((f, idx) => {
            const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
              color: "#64748b",
              labelEs: "Info",
            };
            const key = buildFindingKey(f, idx);
            const expanded = expandedKey === key;
            return (
              <div
                key={key}
                className="rounded-[var(--radius-md)] border border-[var(--studio-border)] overflow-hidden bg-[var(--studio-panel)] hover:border-[var(--studio-border-bright)] transition-colors"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: sev.color,
                }}
              >
                <button
                  className="w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-[var(--studio-surface)] transition"
                  onClick={() => toggleExpand(key)}
                >
                  <div className="mt-0.5 text-slate-400 shrink-0">
                    {expanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`studio-badge ${SEV_CLASS[f.severity] || "studio-sev-info"} !text-[10px]`}>
                        {sev.labelEs}
                      </span>
                      <span className="font-display font-semibold text-slate-100 text-xs">
                        {f.title}
                      </span>
                      <span className="ml-auto text-[11px] font-mono text-[var(--studio-text-secondary)]">
                        {f.rule_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      <span className="text-[var(--studio-text-secondary)] font-mono text-[11px]">
                        <span className="text-slate-200">{f.file_path}</span>:
                        <span className="text-blue-400 font-bold">L{f.line}</span>
                        {f.column ? (
                          <span className="text-slate-500">:C{f.column}</span>
                        ) : null}
                      </span>
                      {f.cwe && (
                        <a
                          href={`https://cwe.mitre.org/data/definitions/${f.cwe.replace(
                            "CWE-",
                            "",
                          )}.html`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[var(--studio-text-secondary)] hover:text-blue-400 transition font-mono text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.cwe} <ExternalLink size={10} />
                        </a>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(f.confidence * 100)}%`,
                              background: confidenceColor(f.confidence),
                            }}
                          />
                        </div>
                        <span
                          className="font-mono font-semibold text-[11px]"
                          style={{ color: confidenceColor(f.confidence) }}
                        >
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-3.5 pt-2 border-t border-[var(--studio-border)] bg-[var(--studio-surface)]/50">
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
  const [copied, setCopied] = useState(false);
  const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
    color: "#64748b",
    labelEs: "Info",
  };
  const owaspClean = (f.owasp || "").toString().split("-")[0];

  const handleCopyFix = () => {
    if (!f.fix_snippet) return;
    navigator.clipboard.writeText(f.fix_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 pt-1">
      <div>
        <div className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-1">
          Descripción técnica del hallazgo
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {f.description || "Sin descripción disponible."}
        </p>
      </div>

      {f.evidence && (
        <div>
          <div className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-1">
            Evidencia en línea {f.line}
          </div>
          <pre
            className="rounded-[var(--radius-sm)] p-2.5 bg-[#080d1a] border border-[var(--studio-border)] text-rose-300 overflow-x-auto text-xs font-mono"
            style={{
              borderLeft: `3px solid ${sev.color}`,
            }}
          >
            <code>{f.evidence}</code>
          </pre>
        </div>
      )}

      {f.data_flow && Array.isArray(f.data_flow) && f.data_flow.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-1">
            Ruta de propagación (Taint Flow)
          </div>
          <ol className="space-y-1">
            {f.data_flow.map((step, i) => {
              const safeStep = step ?? { step: i + 1, line: "?", variable: "" };
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--studio-panel)] border border-[var(--studio-border)] px-2.5 py-1.5 text-xs font-mono"
                >
                  <span className="w-4 h-4 rounded-[2px] bg-blue-950 text-blue-400 border border-blue-800/60 grid place-items-center text-[10px] font-bold shrink-0">
                    {safeStep.step ?? i + 1}
                  </span>
                  <span className="text-blue-300 font-semibold">
                    {safeStep.variable ?? "—"}
                  </span>
                  <ArrowRight size={10} className="text-slate-500" />
                  <span className="text-[var(--studio-text-secondary)]">
                    línea <span className="text-slate-200 font-semibold">{safeStep.line ?? "?"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-emerald-400 mb-1">
          Remediación sugerida
        </div>
        <p className="text-xs text-emerald-300 leading-relaxed bg-emerald-950/20 border border-emerald-800/40 rounded-[var(--radius-sm)] p-2.5">
          {f.recommendation || "Sin recomendación específica disponible."}
        </p>
      </div>

      {f.fix_snippet && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
              <Wrench size={12} /> Código seguro sugerido (Auto-Fix)
            </span>
            <button
              type="button"
              onClick={handleCopyFix}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copiado" : "Copiar fix"}
            </button>
          </div>
          <pre
            className="rounded-[var(--radius-sm)] p-2.5 bg-[#061512] border border-emerald-800/50 text-emerald-200 overflow-x-auto text-xs font-mono"
            style={{
              borderLeft: "3px solid #10b981",
            }}
          >
            <code>{f.fix_snippet}</code>
          </pre>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[11px]">
        {owaspClean && <span className="studio-badge">OWASP: {owaspClean}</span>}
        {f.source && <span className="studio-badge text-blue-300">Fuente: {f.source}</span>}
        {f.sink && <span className="studio-badge text-amber-300">Sumidero: {f.sink}</span>}
      </div>
    </div>
  );
}
