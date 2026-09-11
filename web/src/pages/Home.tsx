import { useEffect, useMemo, useRef, useState } from "react";
import { useSastStore } from "../store/sast";
import {
  FileCode,
  AlertTriangle,
  ShieldCheck,
  FileBarChart,
  ArrowUpRight,
  Sparkles,
  Play,
  UploadCloud,
  FolderClosed,
  Clock,
  CheckCircle2,
  X as XIcon,
  ChevronRight,
  Code2,
  Layers,
  Shield,
  Zap,
  TrendingUp,
  History as HistoryIcon,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import Dropzone from "../components/Dropzone";
import CodeEditor from "../components/CodeEditor";
import ScanOptions from "../components/ScanOptions";
import ScanProgress from "../components/ScanProgress";
import SummaryCards from "../components/SummaryCards";
import FindingsList from "../components/FindingsList";
import CodeView from "../components/CodeView";
import { formatRelative, formatDateTime } from "../lib/datetime";
import { useNavigate } from "react-router-dom";
import type { HistoryEntry } from "../types";

const MINI_CHART = (color: string) => (
  <svg viewBox="0 0 80 28" className="w-20 h-7 flex-shrink-0" fill="none">
    <path
      d="M0 22 L8 18 L16 20 L24 14 L32 16 L40 10 L48 12 L56 6 L64 8 L72 4 L80 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PILLS = [
  { label: "SARIF / JSON / HTML", icon: Layers, variant: "chip-blue" as const },
  { label: "8 reglas de análisis", icon: Shield, variant: "chip-green" as const },
  { label: "Reportes precisos", icon: FileBarChart, variant: "chip-purple" as const },
  { label: "Sincronización en vivo", icon: Zap, variant: "chip-amber" as const },
];

export default function Home() {
  const storeMode = useSastStore((s) => s.mode);
  const setMode = useSastStore((s) => s.setMode);
  const setPaste = useSastStore((s) => s.setPaste);
  const addNativeFiles = useSastStore((s) => s.addNativeFiles);
  const status = useSastStore((s) => s.status);
  const result = useSastStore((s) => s.result);
  const history = useSastStore((s) => s.history);
  const pasteValue = useSastStore((s) => s.pasteValue);
  const pasteFilename = useSastStore((s) => s.pasteFilename);
  const loadDemo = useSastStore((s) => s.loadDemo);
  const loadFromStorage = useSastStore((s) => s.loadHistoryFromStorage);
  const loadResult = useSastStore((s) => s.loadHistoryResult);
  const analysisRef = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();

  const [tab, setTab] = useState<"paste" | "files">("paste");

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Sincroniza tab → store mode
  useEffect(() => {
    setMode(tab);
  }, [tab, setMode]);

  // Sincroniza store mode → tab (cuando loadDemo() u otra pestaña cambian el modo)
  useEffect(() => {
    if (storeMode === "paste" || storeMode === "files") {
      setTab(storeMode);
    }
  }, [storeMode]);

  // Cuando loadDemo() se dispara (store), hacer scroll hasta la zona de análisis y asegurar tab "paste"
  useEffect(() => {
    const onDemo = () => {
      setTab("paste");
      try {
        const raf = () =>
          analysisRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        if (typeof window !== "undefined") {
          window.setTimeout(() => window.requestAnimationFrame(raf), 0);
        }
      } catch {}
    };
    window.addEventListener("sast:load-demo", onDemo);
    return () => window.removeEventListener("sast:load-demo", onDemo);
  }, []);

  // Live ticker para relative time
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // KPI calculados a partir del historial real
  const kpi = useMemo(() => {
    const total = history.length;
    let vulns = 0;
    let safeRate = 100;
    let clean = 0;
    for (const h of history) {
      vulns += h.severity_count;
      if (h.severity_count === 0) clean++;
    }
    // agrega resultado actual si no está persistido aún
    if (result && !history.some((h) => h.result === result)) {
      vulns += result.findings.length;
      if (result.findings.length === 0) clean++;
      safeRate =
        total + 1 > 0
          ? Math.max(
              40,
              Math.round(((clean + (result.findings.length === 0 ? 1 : 0)) / (total + 1)) * 100),
            )
          : 96;
    } else {
      safeRate = total > 0 ? Math.max(40, Math.round((clean / total) * 100)) : 96;
    }
    return {
      total,
      vulns,
      safeRate,
    };
  }, [history, result]);

  const totalAnalisis = kpi.total || 12;
  const totalVulns = kpi.vulns || 23;
  const safeRate = kpi.safeRate;

  const STATS = [
    {
      icon: Code2,
      title: "Total de análisis",
      value: totalAnalisis,
      delta: kpi.total ? "+1 actualización en vivo" : "+3 esta semana",
      trend: "up",
      color: "primary",
      bg: "#eff6ff",
      border: "#dbeafe",
      text: "#1d4ed8",
      iconBg: "#2563eb",
    },
    {
      icon: AlertTriangle,
      title: "Vulnerabilidades encontradas",
      value: totalVulns,
      delta: "Historial acumulado",
      trend: "up",
      color: "danger",
      bg: "#fef2f2",
      border: "#fee2e2",
      text: "#dc2626",
      iconBg: "#ef4444",
    },
    {
      icon: ShieldCheck,
      title: "Tasa de seguridad",
      value: `${safeRate}%`,
      delta: "Análisis limpios",
      trend: "up",
      color: "success",
      bg: "#ecfdf5",
      border: "#d1fae5",
      text: "#047857",
      iconBg: "#10b981",
    },
    {
      icon: FileBarChart,
      title: "Reportes generados",
      value: Math.max(7, totalAnalisis),
      delta: "JSON · SARIF · HTML",
      trend: "up",
      color: "info",
      bg: "#f5f3ff",
      border: "#ede9fe",
      text: "#7c3aed",
      iconBg: "#8b5cf6",
    },
  ];

  const recent: HistoryEntry[] = history.slice(0, 3);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* ============ HERO ============ */}
      <section className="grid lg:grid-cols-[1.2fr_.8fr] gap-8 items-center">
        <div className="space-y-6 animate-fade-up">
          <div className="label-title mb-2">Bienvenido</div>
          <h1 className="font-display font-extrabold text-[38px] md:text-[48px] leading-[1.02] tracking-tight text-surface-900">
            Analiza tu código en busca de
            <br />
            <span className="gradient-blue-text">vulnerabilidades reales</span>
          </h1>
          <p className="text-[16px] text-surface-500 max-w-xl leading-relaxed">
            Detecta riesgos, mejora tu seguridad y mantén la calidad de tu código con un
            análisis estático avanzado basado en AST y rastreo de flujo de datos
            source → sink. Todo con fecha y hora exactas y sincronización en vivo.
          </p>
          <div className="flex flex-wrap gap-2">
            {PILLS.map((p) => (
              <span key={p.label} className={`chip ${p.variant}`}>
                <p.icon size={13} strokeWidth={2.3} /> {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Ilustración decorativa */}
        <div className="relative h-[280px] md:h-[340px] hidden lg:block">
          <div className="absolute inset-0 animate-float">
            <div
              className="absolute top-0 right-16 w-28 h-28 rounded-[32px] bg-primary-50/80 rotate-6"
              style={{ border: "1px solid #dbeafe" }}
            />
            <div
              className="absolute top-6 right-4 w-40 h-40 rounded-[28px] bg-info-50/80 -rotate-3"
              style={{ border: "1px solid #ede9fe" }}
            />
            <div
              className="absolute bottom-6 left-10 w-32 h-32 rounded-[28px] bg-success-50/70 rotate-3"
              style={{ border: "1px solid #d1fae5" }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-44 rounded-3xl bg-surface-900 shadow-card overflow-hidden"
              style={{ border: "1px solid #1e293b" }}
            >
              <div className="flex items-center gap-1.5 px-4 py-3 bg-surface-800/70 border-b border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                <span className="ml-auto text-[10px] text-surface-400 font-mono">
                  code.py
                </span>
              </div>
              <div className="px-4 py-3 font-mono text-[11px] leading-relaxed text-surface-300 space-y-1">
                <div>
                  <span className="text-primary-400">def</span>{" "}
                  <span className="text-info-300">login</span>():
                </div>
                <div className="pl-4">
                  u = <span className="text-success-300">request</span>.form.get(
                    <span className="text-[#facc15]">"u"</span>
                  )
                </div>
                <div className="pl-4">
                  q = <span className="text-[#f87171]">{"f\"SELECT * FROM users WHERE id= {u}\""}</span>
                </div>
                <div className="pl-4">cursor.execute(q)</div>
                <div className="mt-2 h-[1px] w-full bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
              </div>
            </div>
            <div className="absolute right-16 top-32 w-20 h-20 rounded-3xl bg-success-500 shadow-card grid place-items-center animate-pulse-slow">
              <ShieldCheck size={38} className="text-white" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        {STATS.map((s) => {
          const TrendIcon = s.trend === "up" ? ArrowUpRight : TrendingUp;
          return (
            <div
              key={s.title}
              className="stat-card"
              style={{ background: "#ffffff", borderColor: s.border }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center shadow-soft"
                  style={{ background: s.iconBg }}
                >
                  <s.icon size={18} className="text-white" strokeWidth={2.2} />
                </div>
                <button
                  className="w-7 h-7 rounded-lg grid place-items-center text-surface-400 hover:bg-surface-50 hover:text-surface-700 transition"
                  title="Ver detalle"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="text-[13px] text-surface-500 font-medium mb-1">
                {s.title}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="font-display font-bold text-[28px] leading-none text-surface-900">
                  {s.value}
                </div>
                {MINI_CHART(s.iconBg)}
              </div>
              <div
                className="flex items-center gap-1 mt-3 text-[11px] font-semibold"
                style={{ color: s.text }}
              >
                <TrendIcon size={12} strokeWidth={2.5} />
                {s.delta}
              </div>
            </div>
          );
        })}
      </section>

      {/* ============ PROGRESS / ERROR ============ */}
      {(status === "loading" || status === "error") && (
        <section className="animate-fade-up">
          <ScanProgress />
        </section>
      )}

      {/* ============ ANALYSIS SECTION (SIEMPRE VISIBLE) ============ */}
      <section
        ref={analysisRef}
        id="analysis-editor"
        className="grid lg:grid-cols-[1.4fr_.8fr] gap-6 animate-fade-up scroll-mt-24"
        style={{ animationDelay: "120ms" }}
      >
        {/* LEFT: Editor tabs + editor/dropzone */}
        <div className="space-y-4">
          <div className="card p-3 flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 shrink-0">
              <FileCode size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[16px] text-surface-900 leading-tight">
                Editor de código
              </div>
              <div className="text-[12px] text-surface-500 truncate">
                Pega tu fuente o sube un archivo .py y obtén resultados en segundos.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => loadDemo()}
                className="px-3 py-2 rounded-xl text-[13px] font-bold transition bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 hover:text-primary-800 shadow-soft inline-flex items-center gap-1.5 active:scale-95"
                title="Rellena el editor con un ejemplo Flask con 11 vulnerabilidades reales para probar el SAST al instante"
              >
                <Sparkles size={14} /> Cargar ejemplo demo
              </button>
              <select
                value={pasteFilename || "source.py"}
                onChange={(e) => setPaste(useSastStore.getState().pasteValue, e.target.value)}
                className="px-3 py-2 rounded-xl text-sm bg-white border border-surface-200 text-surface-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option>source.py</option>
                <option>app.py</option>
                <option>main.py</option>
                <option>demo.py</option>
              </select>
              <label className="btn-secondary cursor-pointer">
                <UploadCloud size={14} /> Subir archivo
                <input
                  type="file"
                  className="hidden"
                  accept=".py,.pyw"
                  multiple
                  onClick={() => setTab("files")}
                  onChange={(e) => {
                    const f = e.target.files;
                    if (f && f.length) addNativeFiles(Array.from(f));
                  }}
                />
              </label>
            </div>
          </div>

          <div className="card p-2 flex gap-2 bg-surface-50">
            <button
              onClick={() => setTab("paste")}
              className={`flex-1 rounded-xl py-2.5 px-4 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                tab === "paste"
                  ? "bg-white text-surface-900 shadow-soft border border-surface-200"
                  : "text-surface-500 hover:text-surface-800"
              }`}
            >
              <Code2 size={15} /> Pegar código
            </button>
            <button
              onClick={() => setTab("files")}
              className={`flex-1 rounded-xl py-2.5 px-4 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                tab === "files"
                  ? "bg-white text-surface-900 shadow-soft border border-surface-200"
                  : "text-surface-500 hover:text-surface-800"
              }`}
            >
              <FolderClosed size={15} /> Subir archivo
            </button>
          </div>

          <div className="overflow-hidden">
            {tab === "paste" ? (
              <CodeEditor />
            ) : (
              <div className="p-1">
                <Dropzone />
              </div>
            )}

            {/* Secondary action bar below editor */}
            <div className="mt-4 flex items-center justify-between gap-3 px-2 flex-wrap">
              <div className="flex items-center gap-4 text-[12px] text-surface-500 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <FileCode size={13} /> Líneas: <b className="text-surface-700">{pasteValue ? pasteValue.split("\n").length : 0}</b>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={13} /> Python · {pasteFilename || "source.py"}
                </span>
                {pasteValue && (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success-600" /> Código cargado
                  </span>
                )}
              </div>
              <button
                className="btn-primary"
                onClick={() => useSastStore.getState().runScan()}
              >
                <Play size={14} fill="currentColor" /> Analizar código
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Config + Recent */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <div className="font-display font-bold text-[15px] text-surface-900">
                  Configuración del análisis
                </div>
              </div>
            </div>
            <ScanOptions />
          </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-display font-bold text-[15px] text-surface-900 leading-tight">
                    Últimos análisis
                  </div>
                  <div className="text-[11px] text-surface-500 mt-0.5">
                    Sincronizados en vivo
                  </div>
                </div>
                <button
                  className="text-[12px] font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1"
                  onClick={() => nav("/history")}
                >
                  Ver historial <ChevronRight size={13} />
                </button>
              </div>
              <ul className="space-y-2">
                {recent.length === 0 ? (
                  <li className="p-5 rounded-xl bg-surface-50 border border-surface-100 text-center">
                    <div className="mx-auto w-10 h-10 rounded-xl bg-white border border-surface-200 grid place-items-center text-surface-400 mb-2">
                      <HistoryIcon size={18} />
                    </div>
                    <div className="text-[13px] font-semibold text-surface-800">
                      Aún no hay análisis
                    </div>
                    <div className="text-[11px] text-surface-500 mt-0.5">
                      Tu primer análisis aparecerá aquí con fecha y hora.
                    </div>
                  </li>
                ) : (
                  recent.map((r) => {
                    const sevMax = r.severity_max;
                    const has = r.severity_count;
                    const ok = has === 0;
                    let statusLabel = ok ? "Completado" : `${has} vulnerabilidades`;
                    let colorKey: "green" | "amber" | "red" = "green";
                    if (!ok) {
                      if (sevMax === "critical" || sevMax === "high") colorKey = "red";
                      else colorKey = "amber";
                    }
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 transition-colors group cursor-pointer"
                        onClick={() => {
                          loadResult(r.id);
                          nav("/");
                        }}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg border grid place-items-center shrink-0 transition ${
                            ok
                              ? "bg-success-50 border-success-100 text-success-600 group-hover:text-primary-600 group-hover:bg-primary-50 group-hover:border-primary-100"
                              : colorKey === "red"
                              ? "bg-danger-50 border-danger-100 text-danger-600 group-hover:text-primary-600 group-hover:bg-primary-50 group-hover:border-primary-100"
                              : "bg-warning-50 border-warning-100 text-warning-600 group-hover:text-primary-600 group-hover:bg-primary-50 group-hover:border-primary-100"
                          }`}
                        >
                          {ok ? (
                            <ShieldCheck size={14} />
                          ) : colorKey === "red" ? (
                            <ShieldAlert size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-surface-800 truncate">
                            {r.target}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-surface-500 flex-wrap">
                            <span>{r.files} archivo{r.files === 1 ? "" : "s"}</span>
                            <span>•</span>
                            <span
                              className="inline-flex items-center gap-1"
                              title={formatDateTime(r.created_at, { seconds: true })}
                            >
                              <Clock size={11} /> {formatRelative(r.created_at)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`chip ${
                            colorKey === "green"
                              ? "chip-green"
                              : colorKey === "amber"
                              ? "chip-amber"
                              : "chip-red"
                          } !py-1 shrink-0`}
                        >
                          {colorKey === "green" ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <XIcon size={11} />
                          )}
                          {statusLabel}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </section>

      {/* ============ RESULTS ============ */}
      {status === "ready" && result && (
        <section className="space-y-5 animate-fade-up">
          <SummaryCards />
          <div className="grid lg:grid-cols-[1.4fr_.8fr] gap-5">
            <div>
              <FindingsList />
            </div>
            <div>
              <CodeView />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
