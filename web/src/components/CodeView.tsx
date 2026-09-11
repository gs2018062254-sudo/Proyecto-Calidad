import { useMemo } from "react";
import { useSastStore } from "../store/sast";
import { SEVERITY_INFO, severityOrder } from "../lib/severity";
import type { FindingDto } from "../types";
import { FileCode } from "lucide-react";

export default function CodeView() {
  const result = useSastStore((s) => s.result);
  const sources = result?.sources || {};
  const files = Object.keys(sources);
  const activeFile = useSastStore((s) => s.activeFile);
  const setActiveFile = useSastStore((s) => s.setActiveFile);
  const findings = result?.findings || [];
  const toggleExpand = useSastStore((s) => s.toggleExpand);
  const expandedId = useSastStore((s) => s.expandedFindingId);

  if (!result || files.length === 0) return null;

  const currentFile =
    activeFile && sources[activeFile] ? activeFile : files[0];
  const source = sources[currentFile] || "";

  const fileFindings = useMemo(
    () =>
      findings
        .filter((f) => f.file_path === currentFile)
        .sort((a, b) => a.line - b.line),
    [findings, currentFile],
  );

  const findingByLine = useMemo(() => {
    const map = new Map<number, FindingDto[]>();
    for (const f of fileFindings) {
      const arr = map.get(f.line) || [];
      arr.push(f);
      map.set(f.line, arr);
    }
    return map;
  }, [fileFindings]);

  const lines = source.split("\n");
  const maxLineDigits = String(lines.length).length;

  function highestSeverity(lineFindings: FindingDto[]) {
    return lineFindings
      .slice()
      .sort(
        (a, b) => severityOrder(a.severity) - severityOrder(b.severity),
      )[0];
  }

  return (
    <div
      className="glass-surface rounded-2xl overflow-hidden animate-fadeup"
      style={{ animationDelay: "120ms" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/30 overflow-auto scrollbar-thin">
        <FileCode size={14} className="text-neon-cyan shrink-0" />
        {files.length > 1 ? (
          <div className="flex gap-1">
            {files.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={
                  "px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition " +
                  (f === currentFile
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5")
                }
              >
                {f.split(/[\\/]/).pop()}
                <span className="ml-1.5 text-[10px] opacity-60 font-mono">
                  {findings.filter((x) => x.file_path === f).length}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-300 truncate">
            {currentFile}
          </span>
        )}
      </div>

      <div className="max-h-[70vh] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((raw: string, i: number) => {
              const line = i + 1;
              const lineFindings = findingByLine.get(line);
              const highest = lineFindings ? highestSeverity(lineFindings) : null;
              const info = highest ? SEVERITY_INFO[highest.severity] : null;

              const bg = info ? `${info.color}14` : undefined;
              const leftShadow = info
                ? `inset 3px 0 0 ${info.color}`
                : undefined;

              return (
                <tr
                  key={line}
                  className={
                    "transition hover:bg-white/[0.03] group " +
                    (info ? "cursor-pointer" : "")
                  }
                  style={{ background: bg, boxShadow: leftShadow }}
                  onClick={() => {
                    if (lineFindings && lineFindings[0]) {
                      const idx = findings.findIndex(
                        (x) =>
                          x.file_path === currentFile &&
                          x.line === line &&
                          x.rule_id === lineFindings[0].rule_id,
                      );
                      if (idx >= 0) {
                        const key = `${currentFile}:${line}:${lineFindings[0].rule_id}:${idx}`;
                        toggleExpand(expandedId === key ? null : key);
                      }
                    }
                  }}
                  title={
                    lineFindings
                      ? `${lineFindings.length} hallazgo(s): ${lineFindings.map((f) => f.title).join(", ")}`
                      : undefined
                  }
                >
                  <td className="select-none text-right pr-3 pl-4 py-[2px] align-top font-mono text-[12px] text-slate-600 border-r border-white/5 sticky left-0 bg-night-900/60 backdrop-blur-sm">
                    {String(line).padStart(maxLineDigits, " ")}
                  </td>
                  <td className="py-[2px] pr-4 pl-3 align-top w-full">
                    <pre
                      className="code-line whitespace-pre"
                      style={{ color: "#e2e8f0" }}
                    >
                      {raw || "\u00A0"}
                    </pre>
                    {lineFindings && (
                      <div className="flex flex-col gap-1 mt-1 mb-2">
                        {lineFindings.map((f, j) => {
                          const sev = SEVERITY_INFO[f.severity];
                          return (
                            <div
                              key={j}
                              className="rounded-md px-2.5 py-1.5 text-xs flex items-start gap-2"
                              style={{
                                background: `${sev.color}18`,
                                border: `1px solid ${sev.color}33`,
                              }}
                            >
                              <span style={{ color: sev.color }}>
                                {sev.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span
                                  className="font-semibold"
                                  style={{ color: sev.color }}
                                >
                                  {f.title}
                                </span>
                                <span className="ml-2 text-[10px] font-mono text-slate-500">
                                  {f.rule_id}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
