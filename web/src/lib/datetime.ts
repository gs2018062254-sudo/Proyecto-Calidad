const MS = {
  sec: 1000,
  min: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
} as const;

export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  try {
    const s = String(value).trim();
    if (!s) return null;
    // Accept ISO formats with 'Z' or with offset. Fallback to appending Z if missing offset and not local time.
    const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
    const iso = hasTz ? s : s.endsWith("Z") ? s : s + "Z";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return new Date(s);
    return d;
  } catch {
    return null;
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** 24-hour format date + time (local timezone), compact for lists */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  opts: { seconds?: boolean; year?: boolean } = {},
): string {
  const d = parseDate(value);
  if (!d) return "—";
  const showSeconds = opts.seconds ?? false;
  const showYear = opts.year ?? true;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}${showYear ? `/${d.getFullYear()}` : ""}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${showSeconds ? `:${pad(d.getSeconds())}` : ""}`;
  return `${day} ${time}`;
}

/** Date only */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Time only */
export function formatTime(
  value: string | number | Date | null | undefined,
  opts: { seconds?: boolean } = {},
): string {
  const d = parseDate(value);
  if (!d) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}${opts.seconds ? `:${pad(d.getSeconds())}` : ""}`;
}

/** Relative: hace 2 min, hoy a las..., ayer, 3 días atrás */
export function formatRelative(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "—";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const abs = Math.abs(diff);

  if (abs < MS.min) return diff >= 0 ? "hace unos segundos" : "en unos segundos";
  if (abs < MS.hour) {
    const mins = Math.max(1, Math.round(diff / MS.min));
    return diff >= 0 ? `hace ${mins} min` : `en ${mins} min`;
  }
  if (abs < MS.day) {
    const hours = Math.max(1, Math.round(diff / MS.hour));
    return diff >= 0 ? `hace ${hours} h` : `en ${hours} h`;
  }

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now.getTime() - MS.day);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (sameDay) return `hoy a las ${formatTime(d)}`;
  if (isYesterday) return `ayer a las ${formatTime(d)}`;

  if (abs < MS.week) {
    const days = Math.round(diff / MS.day);
    return diff >= 0 ? `hace ${days} días` : `en ${Math.abs(days)} días`;
  }
  if (abs < MS.month) {
    const w = Math.max(1, Math.round(diff / MS.week));
    return diff >= 0 ? `hace ${w} sem` : `en ${w} sem`;
  }
  if (abs < MS.year) {
    const m = Math.max(1, Math.round(diff / MS.month));
    return diff >= 0 ? `hace ${m} mes${m === 1 ? "" : "es"}` : `en ${m} mes${m === 1 ? "" : "es"}`;
  }
  const y = Math.max(1, Math.round(diff / MS.year));
  return diff >= 0 ? `hace ${y} año${y === 1 ? "" : "s"}` : `en ${y} año${y === 1 ? "" : "s"}`;
}

/** 2026-09-10 14-32-12 for filenames */
export function formatForFilename(value: string | number | Date | null | undefined): string {
  const d = parseDate(value) ?? new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}
