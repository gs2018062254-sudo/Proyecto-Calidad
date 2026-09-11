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
} from "lucide-react";

function StatCard({
  label,
  value,
  color,
  bg,
  icon,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="glass-surface rounded-2xl p-5 relative overflow-hidden animate-fadeup"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
            {label}
          </div>
          <div
            className="font-display font-bold text-4xl mt-2"
            style={{ color }}
          >
            {value}
          </div>
        </div>
        <div
          className={`w-11 h-11 rounded-xl grid place-items-center ${bg}`}
          style={{ color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SummaryCards() {
  const result = useSastStore((s) => s.result);
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
    },
    {
      key: "high" as const,
      count: summary.high,
      icon: <ShieldAlert size={20} />,
    },
    {
      key: "medium" as const,
      count: summary.medium,
      icon: <Bug size={20} />,
    },
    {
      key: "low" as const,
      count: summary.low,
      icon: <ShieldCheck size={20} />,
    },
    {
      key: "info" as const,
      count: summary.info,
      icon: <Info size={20} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">
            Resultados del análisis
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Se encontraron {total} hallazgos en{" "}
            <span className="text-slate-200 font-medium">
              {result.files_scanned}
            </span>{" "}
            archivo{result.files_scanned !== 1 ? "s" : ""} ·{" "}
            <span className="font-mono text-neon-emerald">
              {result.duration_ms} ms
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">
            <FileCode size={12} /> {result.target}
          </span>
          <span className="chip">
            <Clock size={12} /> v{result.sast_version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total"
          value={total}
          color="#ffffff"
          bg="bg-white/5"
          icon={<ShieldAlert size={20} />}
          delay={0}
        />
        {sevList.map((s, i) => {
          const info = SEVERITY_INFO[s.key];
          return (
            <StatCard
              key={s.key}
              label={info.labelEs.toUpperCase()}
              value={s.count}
              color={info.color}
              bg={info.bg}
              icon={s.icon}
              delay={(i + 1) * 60}
            />
          );
        })}
      </div>

      <div className="glass-surface rounded-2xl p-4">
        <div className="flex h-3 rounded-full overflow-hidden bg-black/30">
          {sevList.map((s) => {
            const info = SEVERITY_INFO[s.key];
            const pct = total > 0 ? (s.count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s.key}
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: info.color,
                  boxShadow: `0 0 12px ${info.color}55`,
                }}
                title={`${info.labelEs}: ${s.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
          {total === 0 && (
            <div className="h-full w-full bg-neon-emerald/20" />
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {sevList.map((s) => {
            const info = SEVERITY_INFO[s.key];
            return (
              <div
                key={s.key}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: info.color }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: info.color }}
                />
                {info.labelEs}: {s.count}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
