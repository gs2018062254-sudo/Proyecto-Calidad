import { useSastStore } from "../store/sast";
import { SEVERITY_INFO } from "../lib/severity";
import type { SummaryDto } from "../types";
import {
  AlertTriangle,
  Bug,
  ShieldAlert,
  ShieldCheck,
  Info,
  Clock,
  FileCode,
  CalendarClock,
  Shield,
  FileWarning,
} from "lucide-react";
import { formatDateTime, formatRelative } from "../lib/datetime";

function StatCard({
  label,
  value,
  color,
  bg,
  icon,
  delay,
  badge,
}: {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  delay: number;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className="stat-card bg-white relative overflow-hidden animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: bg,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-surface-500 font-bold">
            {label}
          </div>
          <div
            className="font-display font-bold text-3xl mt-2 tabular-nums"
            style={{ color }}
          >
            {value}
          </div>
          {badge}
        </div>
        <div
          className="w-11 h-11 rounded-xl grid place-items-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const SEV_STYLE_BG: Record<string, string> = {
  critical: "#fee2e2",
  high: "#fef3c7",
  medium: "#fef9c3",
  low: "#d1fae5",
  info: "#dbeafe",
};
const SEV_TEXT: Record<string, string> = {
  critical: "#dc2626",
  high: "#b45309",
  medium: "#854d0e",
  low: "#047857",
  info: "#1d4ed8",
};

export default function SummaryCards() {
  const result = useSastStore((s) => s.result);
  const history = useSastStore((s) => s.history);
  if (!result) return null;

  const summary: SummaryDto = result.summary;
  const total =
    summary.critical +
    summary.high +
    summary.medium +
    summary.low +
    summary.info;

  const sevList = [
    {
      key: "critical" as const,
      count: summary.critical,
      icon: <AlertTriangle size={20} />,
      label: "Críticos",
    },
    {
      key: "high" as const,
      count: summary.high,
      icon: <ShieldAlert size={20} />,
      label: "Altos",
    },
    {
      key: "medium" as const,
      count: summary.medium,
      icon: <Bug size={20} />,
      label: "Medios",
    },
    {
      key: "low" as const,
      count: summary.low,
      icon: <ShieldCheck size={20} />,
      label: "Bajos",
    },
    {
      key: "info" as const,
      count: summary.info,
      icon: <Info size={20} />,
      label: "Info",
    },
  ];

  const timestamp = result.timestamp;

  return (
    <div className="space-y-5">
      {/* Header with timestamp */}
      <div className="card p-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 shrink-0">
            <Shield size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl text-surface-900 leading-tight">
              Resultados del análisis
            </h2>
            <p className="text-[14px] text-surface-500 mt-1 leading-relaxed">
              Se encontraron{" "}
              <b className="text-surface-800">{total}</b> hallazgos en{" "}
              <b className="text-surface-800">{result.files_scanned}</b>{" "}
              archivo{result.files_scanned !== 1 ? "s" : ""} ·{" "}
              <b className="text-surface-800 font-mono">
                {result.duration_ms < 1000
                  ? `${result.duration_ms} ms`
                  : `${(result.duration_ms / 1000).toFixed(2)} s`}
              </b>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip chip-blue inline-flex items-center gap-1.5">
                <FileCode size={12} /> {result.target}
              </span>
              <span className="chip chip-gray">v{result.sast_version}</span>
              {timestamp && (
                <>
                  <span className="chip chip-gray inline-flex items-center gap-1.5">
                    <CalendarClock size={12} />
                    {formatDateTime(timestamp, { seconds: true })}
                    <span className="opacity-60">· {result.timezone ?? "UTC"}</span>
                  </span>
                  <span className="chip chip-green inline-flex items-center gap-1.5">
                    <Clock size={12} /> {formatRelative(timestamp)}
                  </span>
                </>
              )}
              {result.filters_applied && (
                <>
                  <span className="chip chip-amber !py-1 text-[11px]">
                    Conf ≥ {Math.round((result.filters_applied.min_confidence ?? 0) * 100)}%
                  </span>
                  <span className="chip chip-amber !py-1 text-[11px]">
                    Sev ≥ {result.filters_applied.min_severity}
                  </span>
                  {result.filters_applied.exclude_tests ? (
                    <span className="chip chip-gray !py-1 text-[11px]">Tests excluidos</span>
                  ) : (
                    <span className="chip chip-green !py-1 text-[11px]">Tests incluidos</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {total === 0 ? (
            <span className="chip chip-green">
              <ShieldCheck size={12} /> Código limpio
            </span>
          ) : total <= 3 ? (
            <span className="chip chip-amber">
              <FileWarning size={12} /> Riesgo bajo
            </span>
          ) : summary.critical + summary.high >= 2 ? (
            <span className="chip chip-red">
              <AlertTriangle size={12} /> Riesgo alto
            </span>
          ) : (
            <span className="chip chip-amber">
              <FileWarning size={12} /> Riesgo medio
            </span>
          )}
          {history.some((h) => h.result === result) ? null : null}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total"
          value={total}
          color="#0f172a"
          bg="#e2e8f0"
          icon={<ShieldAlert size={20} />}
          delay={0}
        />
        {sevList.map((s, i) => {
          const info = SEVERITY_INFO[s.key];
          void info;
          return (
            <StatCard
              key={s.key}
              label={s.label.toUpperCase()}
              value={s.count}
              color={SEV_TEXT[s.key]}
              bg={SEV_STYLE_BG[s.key]}
              icon={s.icon}
              delay={(i + 1) * 60}
            />
          );
        })}
      </div>

      {/* Severity bar */}
      <div className="card p-5">
        <div className="flex h-3 rounded-full overflow-hidden bg-surface-100">
          {sevList.map((s) => {
            const pct = total > 0 ? (s.count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s.key}
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: SEV_TEXT[s.key],
                }}
                title={`${s.label}: ${s.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
          {total === 0 && (
            <div className="h-full w-full" style={{ background: "#10b981" }} />
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {sevList.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: SEV_TEXT[s.key] }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
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
