import { useState } from "react";
import CodeEditor from "../components/CodeEditor";
import Dropzone from "../components/Dropzone";
import ScanOptions from "../components/ScanOptions";
import ScanProgress from "../components/ScanProgress";
import SummaryCards from "../components/SummaryCards";
import FindingsList from "../components/FindingsList";
import CodeView from "../components/CodeView";
import { useSastStore } from "../store/sast";
import clsx from "clsx";
import {
  Shield,
  ScanLine,
  ShieldCheck,
  Database,
  FileWarning,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Database size={20} />,
    title: "Taint Analysis",
    desc: "Rastreo de flujo source → sink para SQLi, RCE, Path, XSS.",
    color: "#00D1FF",
  },
  {
    icon: <FileWarning size={20} />,
    title: "8 reglas listas",
    desc: "Cubriendo CWE-79/89/78/22/798/676/327/916 · OWASP Top 10.",
    color: "#FF9A3C",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Alta precisión",
    desc: "Falsa positividad reducida mediante heurísticas y confianza.",
    color: "#3DDC97",
  },
  {
    icon: <Sparkles size={20} />,
    title: "Reportes exportables",
    desc: "JSON, SARIF 2.1 y HTML standalone · listos para CI.",
    color: "#B28BFF",
  },
];

export default function Home() {
  const setMode = useSastStore((s) => s.setMode);
  const status = useSastStore((s) => s.status);
  const result = useSastStore((s) => s.result);

  const [tab, setTab] = useState<"paste" | "files">("paste");

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      {/* HERO */}
      <section className="pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon-emerald/30 bg-neon-emerald/10 px-3.5 py-1 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-emerald opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-emerald" />
          </span>
          <span className="text-[12px] font-semibold tracking-wider uppercase text-neon-emerald">
            Online SAST · sin instalación
          </span>
        </div>

        <h1 className="font-display font-bold text-[44px] md:text-[58px] leading-[1.05] tracking-tight text-white">
          Analiza código Python en busca de
          <br />
          <span className="gradient-text">vulnerabilidades reales</span>
        </h1>

        <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Sube tus archivos, pega tu código y obtén un análisis visual
          interactivo con <span className="text-slate-200 font-medium">8 reglas</span>,
          rastreo de flujo de datos y exportación a
          <span className="text-neon-emerald font-medium"> SARIF · JSON · HTML</span>.
        </p>

        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <button
            className="btn-neon !px-6 !py-3"
            onClick={() => {
              document
                .getElementById("analyzer")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <ScanLine size={18} /> Analizar ahora
          </button>
          <button
            className="btn-ghost !px-6 !py-3"
            onClick={() => {
              useSastStore.getState().loadDemo();
              setTab("paste");
              setMode("paste");
              setTimeout(() => {
                useSastStore.getState().runScan();
                document
                  .getElementById("results")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 80);
            }}
          >
            <Zap size={16} /> Demo 1‑clic
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="pb-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="glass-surface rounded-2xl p-4 animate-fadeup"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className="w-10 h-10 rounded-xl grid place-items-center mb-3"
              style={{ background: `${f.color}18`, color: f.color }}
            >
              {f.icon}
            </div>
            <div className="font-display font-semibold text-white text-[14px]">
              {f.title}
            </div>
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">
              {f.desc}
            </div>
          </div>
        ))}
      </section>

      {/* ANALYZER */}
      <section id="analyzer" className="pb-10 scroll-mt-24">
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-surface rounded-2xl p-1.5 flex gap-1.5 bg-black/20">
              <button
                className={clsx(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2",
                  tab === "paste"
                    ? "bg-white/[0.07] text-white shadow-glass-sm"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => {
                  setTab("paste");
                  setMode("paste");
                }}
              >
                <Shield size={15} /> Pegar código
              </button>
              <button
                className={clsx(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2",
                  tab === "files"
                    ? "bg-white/[0.07] text-white shadow-glass-sm"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => {
                  setTab("files");
                  setMode("files");
                }}
              >
                <ScanLine size={15} /> Subir archivos / .zip
              </button>
            </div>

            {tab === "paste" ? <CodeEditor /> : <Dropzone />}
          </div>

          <div>
            <ScanOptions />
          </div>
        </div>
      </section>

      {/* PROGRESS / ERROR */}
      {(status === "loading" || status === "error") && (
        <div className="pb-10">
          <ScanProgress />
        </div>
      )}

      {/* RESULTS */}
      {status === "ready" && result && (
        <section id="results" className="pb-16 scroll-mt-24 space-y-5">
          <SummaryCards />
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <FindingsList />
            </div>
            <div className="lg:col-span-2">
              <CodeView />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
