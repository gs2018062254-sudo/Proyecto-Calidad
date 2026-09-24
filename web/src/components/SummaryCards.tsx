import { useSastStore } from "../store/sast";
import type { SummaryDto } from "../types";
import {
  AlertTriangle,
  Bug,
  ShieldAlert,
  ShieldCheck,
  Info,
  FileCode,
  CalendarClock,
  Shield,
  FileWarning,
} from "lucide-react";
import { formatDateTime } from "../lib/datetime";

function StatCard({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] flex items-start justify-between">
      <div>
        <div className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
          {label}
        </div>
        <div
          className="font-display font-bold text-2xl mt-1 tabular-nums"
          style={{ color }}
        >
          {value}
        </div>
      </div>
      <div
        className="w-8 h-8 rounded-[var(--radius-sm)] grid place-items-center"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
    </div>
  );
}

const SEV_STYLE_BG: Record<string, string> = {
  critical: "rgba(225, 29, 72, 0.15)",
  high: "rgba(234, 88, 12, 0.15)",
  medium: "rgba(202, 138, 4, 0.15)",
  low: "rgba(5, 150, 105, 0.15)",
  info: "rgba(37, 99, 235, 0.15)",
};
const SEV_TEXT: Record<string, string> = {
  critical: "#fda4af",
  high: "#fdba74",
  medium: "#fde047",
  low: "#6ee7b7",
  info: "#93c5fd",
};

export default function SummaryCards() {
  const result = useSastStore((s) => s.result);
  if (!result) return null;

  const rawSummary = (result.summary || {}) as Partial<SummaryDto> | undefined | null;
  const summary: SummaryDto = {
    critical: typeof rawSummary?.critical === "number" ? rawSummary.critical : 0,
    high: typeof rawSummary?.high === "number" ? rawSummary.high : 0,
    medium: typeof rawSummary?.medium === "number" ? rawSummary.medium : 0,
    low: typeof rawSummary?.low === "number" ? rawSummary.low : 0,
    info: typeof rawSummary?.info === "number" ? rawSummary.info : 0,
  };
  const total =
    summary.critical + summary.high + summary.medium + summary.low + summary.info;

  const sevList = [
    {
      key: "critical" as const,
      count: summary.critical,
      icon: <AlertTriangle size={16} />,
      label: "Críticos",
    },
    {
      key: "high" as const,
      count: summary.high,
      icon: <ShieldAlert size={16} />,
      label: "Altos",
    },
    {
      key: "medium" as const,
      count: summary.medium,
      icon: <Bug size={16} />,
      label: "Medios",
    },
    {
      key: "low" as const,
      count: summary.low,
      icon: <ShieldCheck size={16} />,
      label: "Bajos",
    },
    {
      key: "info" as const,
      count: summary.info,
      icon: <Info size={16} />,
      label: "Info",
    },
  ];

  const timestamp = result.timestamp;
  const filesScanned = typeof result.files_scanned === "number" ? result.files_scanned : 0;
  const durationMs = typeof result.duration_ms === "number" ? result.duration_ms : 0;

  return (
    <div className="space-y-4">
      {/* Header with audit metadata */}
      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border-bright)] grid place-items-center text-blue-400 shrink-0">
            <Shield size={20} strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Reporte de Auditoría de Código
            </h2>
            <p className="text-xs text-[var(--studio-text-secondary)] mt-0.5 font-mono">
              <span>{total} detecciones</span>
              <span className="mx-2 text-[var(--studio-border-bright)]">|</span>
              <span>{filesScanned} archivo{filesScanned !== 1 ? "s" : ""}</span>
              <span className="mx-2 text-[var(--studio-border-bright)]">|</span>
              <span className="text-blue-400">
                {durationMs < 1000
                  ? `${durationMs} ms`
                  : `${(durationMs / 1000).toFixed(2)} s`}
              </span>
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="studio-badge text-blue-400 border-blue-500/30 bg-blue-950/40">
            <FileCode size={12} /> {result.target}
          </span>
          {timestamp && (
            <span className="studio-badge">
              <CalendarClock size={12} />
              {formatDateTime(timestamp, { seconds: true })}
            </span>
          )}
          {total === 0 ? (
            <span className="studio-badge studio-sev-low">
              <ShieldCheck size={12} /> Código limpio
            </span>
          ) : summary.critical + summary.high >= 2 ? (
            <span className="studio-badge studio-sev-critical">
              <AlertTriangle size={12} /> Riesgo crítico
            </span>
          ) : (
            <span className="studio-badge studio-sev-medium">
              <FileWarning size={12} /> Riesgo moderado
            </span>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard
          label="Total Hallazgos"
          value={total}
          color="#f3f6fa"
          bg="rgba(255, 255, 255, 0.06)"
          icon={<ShieldAlert size={16} />}
        />
        {sevList.map((s) => (
          <StatCard
            key={s.key}
            label={s.label}
            value={s.count}
            color={SEV_TEXT[s.key]}
            bg={SEV_STYLE_BG[s.key]}
            icon={s.icon}
          />
        ))}
      </div>

      {/* Severity distribution bar */}
      <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
        <div className="flex h-2 rounded-[var(--radius-sm)] overflow-hidden bg-slate-900">
          {sevList.map((s) => {
            const pct = total > 0 ? (s.count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s.key}
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: SEV_TEXT[s.key],
                }}
                title={`${s.label}: ${s.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
          {total === 0 && <div className="h-full w-full bg-emerald-500" />}
        </div>
        <div className="flex flex-wrap gap-4 mt-2.5">
          {sevList.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-1.5 text-[11px] font-mono"
              style={{ color: SEV_TEXT[s.key] }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: SEV_TEXT[s.key] }}
              />
              {s.label}: {s.count}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
