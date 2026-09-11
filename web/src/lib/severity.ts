import type { Severity } from "../types";

export const SEVERITY_INFO: Record<
  Exclude<Severity, "all">,
  {
    label: string;
    labelEs: string;
    emoji: string;
    color: string;
    bg: string;
    ring: string;
    border: string;
    text: string;
    order: number;
  }
> = {
  critical: {
    label: "CRITICAL",
    labelEs: "Crítico",
    emoji: "🔴",
    color: "#FF3B6B",
    bg: "bg-[rgba(255,59,107,0.15)]",
    ring: "ring-[rgba(255,59,107,0.45)]",
    border: "border-[rgba(255,59,107,0.55)]",
    text: "text-[#FF7A98]",
    order: 0,
  },
  high: {
    label: "HIGH",
    labelEs: "Alto",
    emoji: "🟠",
    color: "#FF9A3C",
    bg: "bg-[rgba(255,154,60,0.14)]",
    ring: "ring-[rgba(255,154,60,0.4)]",
    border: "border-[rgba(255,154,60,0.55)]",
    text: "text-[#FFB978]",
    order: 1,
  },
  medium: {
    label: "MEDIUM",
    labelEs: "Medio",
    emoji: "🟡",
    color: "#FFD23F",
    bg: "bg-[rgba(255,210,63,0.12)]",
    ring: "ring-[rgba(255,210,63,0.4)]",
    border: "border-[rgba(255,210,63,0.55)]",
    text: "text-[#FFE48A]",
    order: 2,
  },
  low: {
    label: "LOW",
    labelEs: "Bajo",
    emoji: "🟢",
    color: "#3DDC97",
    bg: "bg-[rgba(61,220,151,0.12)]",
    ring: "ring-[rgba(61,220,151,0.4)]",
    border: "border-[rgba(61,220,151,0.55)]",
    text: "text-[#7FEAC0]",
    order: 3,
  },
  info: {
    label: "INFO",
    labelEs: "Info",
    emoji: "🔵",
    color: "#5B8DEF",
    bg: "bg-[rgba(91,141,239,0.12)]",
    ring: "ring-[rgba(91,141,239,0.4)]",
    border: "border-[rgba(91,141,239,0.55)]",
    text: "text-[#95B6F5]",
    order: 4,
  },
};

export function severityOrder(s: string): number {
  return (SEVERITY_INFO as any)[s]?.order ?? 99;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function confidenceColor(c: number): string {
  if (c >= 0.9) return "#FF3B6B";
  if (c >= 0.75) return "#FF9A3C";
  if (c >= 0.55) return "#FFD23F";
  return "#3DDC97";
}
