import { useMemo } from "react";
import { useSastStore } from "../store/sast";
import { SEVERITY_INFO, severityOrder } from "../lib/severity";
import type { FindingDto } from "../types";
import { FileCode, CalendarClock, Clock } from "lucide-react";
import { formatDateTime, formatRelative, formatTime } from "../lib/datetime";

export default function CodeView() {
  const result = useSastStore((s) => s.result);
  const sources = (result && (result as any).sources) ? (result as any).sources : {};
  const files = Object.keys(sources || {});
  const activeFile = useSastStore((s) => s.activeFile);
  const setActiveFile = useSastStore((s) => s.setActiveFile);
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  const toggleExpand = useSastStore((s) => s.toggleExpand);
  const expandedId = useSastStore((s) => s.expandedFindingId);

  if (!result || files.length === 0) return null;

  const currentFile =
    activeFile && sources[activeFile] ? activeFile : files[0];
  const source = (sources[currentFile] as string | undefined) || "";

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
        (a, b) =>
          severityOrder((a?.severity ?? "info") as any) -
          severityOrder((b?.severity ?? "info") as any),
      )[0];
  }

  const tz = result.timezone ?? "UTC";

  return (
    <div className="card overflow-hidden animate-fade-up" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-surface-100 bg-surface-50 overflow-auto scrollbar-thin">
        <FileCode size={14} className="text-primary-600 shrink-0" />
        {files.length > 1 ? (
          <div className="flex gap-1 flex-wrap">
            {files.map((f) => {
              const n = findings.filter((x) => x.file_path === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFile(f)}
                  className={
                    "px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition border " +
                    (f === currentFile
                      ? "bg-white text-primary-700 border-primary-200 shadow-soft"
                      : "bg-transparent border-transparent text-surface-500 hover:bg-white hover:text-surface-800 hover:border-surface-200")
                  }
                >
                  {f.split(/[\\/]/).pop()}
                  <span className="ml-1.5 text-[10px] opacity-70 font-mono font-bold">
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-[13px] font-semibold text-surface-700 truncate">
            {currentFile}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {result.timestamp && (
            <>
              <span
                className="chip chip-gray !py-1 inline-flex items-center gap-1.5"
                title={formatDateTime(result.timestamp, { seconds: true })}
              >
                <CalendarClock size={11} /> {formatDateTime(result.timestamp, { seconds: true })} · {tz}
              </span>
              <span className="chip chip-green !py-1 inline-flex items-center gap-1.5">
                <Clock size={11} /> {formatRelative(result.timestamp)} · {formatTime(result.timestamp)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((raw: string, i: number) => {
              const line = i + 1;
              const lineFindings = findingByLine.get(line);
              const highest = lineFindings ? highestSeverity(lineFindings) : null;
              const info = highest
                ? SEVERITY_INFO[highest?.severity ?? "info"] ?? {
                    color: "#64748b",
                    emoji: "ℹ️",
                    labelEs: "Info",
                  }
                : null;

              const bg = info ? `${info.color}12` : undefined;
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
                      : `Línea ${line}`
                  }
                >
                  <td className="select-none text-right pr-3 pl-4 py-[2px] align-top font-mono text-[12px] text-surface-400 border-r border-surface-100 sticky left-0 bg-white/90 backdrop-blur-sm">
                    {String(line).padStart(maxLineDigits, " ")}
                  </td>
                  <td className="py-[2px] pr-4 pl-3 align-top w-full">
                    <pre
                      className="code-line whitespace-pre"
                      style={{ color: "#0f172a" }}
                    >
                      {raw || "\u00A0"}
                    </pre>
                    {lineFindings && (
                      <div className="flex flex-col gap-1 mt-1 mb-2">
                        {lineFindings.map((f, j) => {
                          const sev = SEVERITY_INFO[f?.severity ?? "info"] ?? {
                            color: "#64748b",
                            emoji: "ℹ️",
                            labelEs: "Info",
                          };
                          return (
                            <div
                              key={j}
                              className="rounded-lg px-2.5 py-1.5 text-[12px] flex items-start gap-2 border"
                              style={{
                                background: `${sev.color}14`,
                                borderColor: `${sev.color}33`,
                              }}
                            >
                              <span style={{ color: sev.color }} className="shrink-0">
                                {sev.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span
                                  className="font-bold"
                                  style={{ color: sev.color }}
                                >
                                  {f?.title ?? "Hallazgo"}
                                </span>
                                <span className="ml-2 text-[10px] font-mono text-surface-500">
                                  {f?.rule_id ?? "rule"}
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
