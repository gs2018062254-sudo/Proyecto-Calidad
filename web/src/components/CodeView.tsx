import { useMemo } from "react";
import { useSastStore } from "../store/sast";
import { SEVERITY_INFO, severityOrder } from "../lib/severity";
import type { FindingDto } from "../types";
import { FileCode, CalendarClock, Clock } from "lucide-react";
import { formatDateTime, formatRelative } from "../lib/datetime";

export default function CodeView() {
  const result = useSastStore((s) => s.result);
  const sources = (result && (result as any).sources) ? (result as any).sources : {};
  const files = Object.keys(sources || {});
  const activeFile = useSastStore((s) => s.activeFile);
  const setActiveFile = useSastStore((s) => s.setActiveFile);
  const findings: FindingDto[] = Array.isArray(result?.findings) ? result.findings : [];
  const toggleExpand = useSastStore((s) => s.toggleExpand);
  const expandedId = useSastStore((s) => s.expandedFindingId);

  const currentFile =
    activeFile && sources[activeFile] ? activeFile : (files[0] || "");
  const source = currentFile ? ((sources[currentFile] as string | undefined) || "") : "";

  const fileFindings = useMemo(
    () =>
      currentFile
        ? findings
            .filter((f: FindingDto) => f.file_path === currentFile)
            .sort((a: FindingDto, b: FindingDto) => a.line - b.line)
        : [],
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

  if (!result || files.length === 0) return null;

  const lines = source.split("\n");
  const maxLineDigits = String(lines.length).length;

  function highestSeverity(lineFindings: FindingDto[]) {
    return lineFindings
      .slice()
      .sort(
        (a, b) =>
          severityOrder((a?.severity ?? "info") as any) -
          severityOrder((b?.severity ?? "info") as any),
      )[0];
  }

  const tz = result.timezone ?? "UTC";

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3.5 py-2 border-b border-[var(--studio-border)] bg-[var(--studio-surface)] overflow-auto">
        <FileCode size={14} className="text-blue-400 shrink-0" />
        {files.length > 1 ? (
          <div className="flex gap-1 flex-wrap">
            {files.map((f) => {
              const n = findings.filter((x: FindingDto) => x.file_path === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFile(f)}
                  className={
                    "px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-mono font-medium whitespace-nowrap transition border " +
                    (f === currentFile
                      ? "bg-[var(--studio-surface-active)] text-blue-300 border-blue-500/40"
                      : "bg-transparent border-transparent text-[var(--studio-text-secondary)] hover:bg-slate-800/60 hover:text-slate-200")
                  }
                >
                  {f.split(/[\\/]/).pop()}
                  <span className="ml-1 text-[10px] opacity-75 font-mono">
                    ({n})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-xs font-mono font-medium text-slate-200 truncate">
            {currentFile}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {result.timestamp && (
            <>
              <span
                className="studio-badge"
                title={formatDateTime(result.timestamp, { seconds: true })}
              >
                <CalendarClock size={10} /> {formatDateTime(result.timestamp, { seconds: true })} · {tz}
              </span>
              <span className="studio-badge">
                <Clock size={10} /> {formatRelative(result.timestamp)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto bg-[#080d1a]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((raw: string, i: number) => {
              const line = i + 1;
              const lineFindings = findingByLine.get(line);
              const highest = lineFindings ? highestSeverity(lineFindings) : null;
              const info = highest
                ? SEVERITY_INFO[highest?.severity ?? "info"] ?? {
                    color: "#64748b",
                    labelEs: "Info",
                  }
                : null;

              const bg = info ? `${info.color}16` : undefined;
              const leftShadow = info
                ? `inset 3px 0 0 ${info.color}`
                : undefined;

              return (
                <tr
                  key={line}
                  className={
                    "transition group " + (info ? "cursor-pointer" : "")
                  }
                  style={{
                    background: bg,
                    boxShadow: leftShadow,
                  }}
                  onClick={() => {
                    if (lineFindings && lineFindings[0]) {
                      const idx = findings.findIndex(
                        (x: FindingDto) =>
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
                      : `Línea ${line}`
                  }
                >
                  <td className="select-none text-right pr-3 pl-3 py-[2px] align-top font-mono text-[11px] text-slate-500 border-r border-[var(--studio-border)] sticky left-0 bg-[#080d1a]">
                    {String(line).padStart(maxLineDigits, " ")}
                  </td>
                  <td className="py-[2px] pr-4 pl-3 align-top w-full">
                    <pre
                      className="whitespace-pre font-mono text-xs"
                      style={{ color: "#f1f5f9" }}
                    >
                      {raw || "\u00A0"}
                    </pre>
                    {lineFindings && (
                      <div className="flex flex-col gap-1 mt-1 mb-2">
                        {lineFindings.map((f, j) => {
                          const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
                            color: "#64748b",
                            labelEs: "Info",
                          };
                          return (
                            <div
                              key={j}
                              className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-mono flex items-center gap-2 border"
                              style={{
                                background: `${sev.color}18`,
                                borderColor: `${sev.color}40`,
                              }}
                            >
                              <span
                                className="font-semibold"
                                style={{ color: sev.color }}
                              >
                                {f?.title ?? "Hallazgo"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {f?.rule_id ?? "rule"}
                              </span>
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
