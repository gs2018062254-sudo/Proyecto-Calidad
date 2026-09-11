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
} from "lucide-react";

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

  const filtered: FindingDto[] = result.findings
    .filter((f) => {
      if (activeFilter !== "all" && f.severity !== activeFilter) return false;
      if (activeFile && f.file_path !== activeFile) return false;
      return true;
    })
    .sort(
      (a, b) =>
        severityOrder(a.severity) - severityOrder(b.severity) ||
        b.confidence - a.confidence,
    );

  const filters: { value: Severity; label: string; emoji: string; color: string }[] = [
    { value: "all", label: "Todos", emoji: "🛡️", color: "#cbd5e1" },
    { value: "critical", label: "Crítico", emoji: "🔴", color: SEVERITY_INFO.critical.color },
    { value: "high", label: "Alto", emoji: "🟠", color: SEVERITY_INFO.high.color },
    { value: "medium", label: "Medio", emoji: "🟡", color: SEVERITY_INFO.medium.color },
    { value: "low", label: "Bajo", emoji: "🟢", color: SEVERITY_INFO.low.color },
    { value: "info", label: "Info", emoji: "🔵", color: SEVERITY_INFO.info.color },
  ];

  return (
    <div className="glass-surface rounded-2xl p-5 space-y-4 animate-fadeup" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase transition border flex items-center gap-1",
                  activeFilter === f.value
                    ? "bg-white/8 border-white/20"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200",
                )}
                style={
                  activeFilter === f.value
                    ? { color: f.color, borderColor: `${f.color}55`, background: `${f.color}12` }
                    : undefined
                }
              >
                <span>{f.emoji}</span>
                {f.label}
                <span className="opacity-60 ml-0.5">
                  ({f.value === "all"
                    ? result.findings.length
                    : result.findings.filter((x) => x.severity === f.value).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allFiles.length > 1 && (
            <select
              value={activeFile}
              onChange={(e) => setActiveFile(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-neon-cyan/50"
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
              className="btn-ghost !py-1.5 !px-2.5 text-xs"
              onClick={exportJson}
              title="Exportar JSON"
            >
              <FileJson size={13} /> JSON
            </button>
            <button
              className="btn-ghost !py-1.5 !px-2.5 text-xs"
              onClick={exportSarif}
              title="Exportar SARIF 2.1"
            >
              <FileCode size={13} /> SARIF
            </button>
            <button
              className="btn-ghost !py-1.5 !px-2.5 text-xs"
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
          <div className="text-5xl mb-3">✨</div>
          <div className="font-display font-semibold text-white">
            No se encontraron hallazgos con estos filtros.
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Intenta reducir la severidad mínima o la confianza.
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-auto scrollbar-thin pr-1">
          {filtered.map((f, idx) => {
            const sev = SEVERITY_INFO[f.severity];
            const key = buildFindingKey(f, idx);
            const expanded = expandedKey === key;
            return (
              <div
                key={key}
                className={clsx(
                  "rounded-xl border overflow-hidden transition-all",
                  "bg-black/20",
                )}
                style={{ borderLeftWidth: 3, borderLeftColor: sev.color }}
              >
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/3 transition"
                  onClick={() => toggleExpand(key)}
                >
                  <div className="mt-0.5">
                    {expanded ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={clsx("tag-severity", sev.bg, sev.text)}
                      >
                        {sev.emoji} {sev.labelEs}
                      </span>
                      <span className="font-display font-semibold text-slate-100 text-[14px]">
                        {f.title}
                      </span>
                      <span className="ml-auto text-[11px] font-mono text-slate-500">
                        {f.rule_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-slate-400">
                        <span className="text-slate-300">{f.file_path}</span>:
                        <span className="text-neon-cyan font-mono">
                          L{f.line}
                        </span>
                        {f.column ? (
                          <span className="text-slate-500 font-mono">
                            :C{f.column}
                          </span>
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
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-neon-cyan transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.cwe} <ExternalLink size={10} />
                        </a>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-black/40 overflow-hidden">
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
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/5 animate-fadeup">
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
  const sev = SEVERITY_INFO[f.severity];
  return (
    <div className="space-y-3 pt-3">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
          Descripción
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          {f.description}
        </p>
      </div>

      {f.evidence && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
            Evidencia (L{f.line})
          </div>
          <pre
            className="code-line rounded-lg p-3 bg-black/40 border border-white/5 overflow-auto"
            style={{
              boxShadow: `inset 3px 0 0 ${sev.color}`,
            }}
          >
            <code>{f.evidence}</code>
          </pre>
        </div>
      )}

      {f.data_flow && f.data_flow.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
            Flujo de datos (Taint Analysis)
          </div>
          <ol className="space-y-1.5">
            {f.data_flow.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-lg bg-black/20 border border-white/5 px-3 py-2"
              >
                <div
                  className="w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold shrink-0 text-night-900"
                  style={{ background: sev.color }}
                >
                  {step.step}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-neon-cyan font-mono font-semibold">
                    {step.variable}
                  </span>
                  <span className="text-slate-400 mx-1.5">
                    <ArrowRight size={12} className="inline" />
                  </span>
                  <span className="text-slate-300">
                    línea <span className="font-mono text-neon-cyan">{step.line}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
          Recomendación
        </div>
        <p className="text-sm text-neon-emerald/90 leading-relaxed">
          💡 {f.recommendation}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {f.owasp && (
          <span className="chip">OWASP · {f.owasp.split("-")[0]}</span>
        )}
        {f.source && <span className="chip">Source: {f.source}</span>}
        {f.sink && <span className="chip">Sink: {f.sink}</span>}
      </div>
    </div>
  );
}
