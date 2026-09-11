import { useState } from "react";
import { useSastStore } from "../store/sast";
import {
  GitBranch,
  Play,
  ShieldCheck,
  Globe,
  AlertCircle,
  Code2,
  Sparkles,
} from "lucide-react";

export function GitHubIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const POPULAR_EXAMPLES = [
  {
    name: "NestorSnIbz/skinbridge-creator-tools",
    lang: "TypeScript",
    desc: "Herramientas y exportadores 3D para skins (React / Vite)",
  },
  {
    name: "pallets/flask",
    lang: "Python",
    desc: "Microframework web estándar para Python",
  },
  {
    name: "expressjs/express",
    lang: "JavaScript",
    desc: "Framework web minimalista para Node.js",
  },
  {
    name: "bottlepy/bottle",
    lang: "Python",
    desc: "Framework WSGI ligero para microservicios",
  },
];

const SUPPORTED_LANGS = [
  { name: "Python", exts: ".py, .pyw" },
  { name: "TypeScript / TSX", exts: ".ts, .tsx" },
  { name: "JavaScript / JSX", exts: ".js, .jsx, .mjs" },
  { name: "PHP", exts: ".php" },
  { name: "Java / Kotlin", exts: ".java, .kt" },
  { name: "Go", exts: ".go" },
  { name: "C / C++ / C#", exts: ".c, .cpp, .cs" },
  { name: "SQL & Config", exts: ".sql, .json, .env" },
];

export default function GitHubRepoSelector() {
  const publicUrlInput = useSastStore((s) => s.githubPublicRepoInput);
  const setPublicUrlInput = useSastStore((s) => s.setGithubPublicRepoInput);
  const selectedBranch = useSastStore((s) => s.selectedBranch);
  const setSelectedBranch = useSastStore((s) => s.setSelectedBranch);
  const githubError = useSastStore((s) => s.githubError);
  const runScan = useSastStore((s) => s.runGitHubScan);
  const status = useSastStore((s) => s.status);

  const [branchInput, setBranchInput] = useState(selectedBranch || "main");

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicUrlInput.trim()) return;
    setSelectedBranch(branchInput.trim() || "main");
    runScan(publicUrlInput.trim(), branchInput.trim() || "main");
  };

  const handlePickExample = (repoName: string) => {
    setPublicUrlInput(repoName);
    setBranchInput("main");
    setSelectedBranch("main");
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Aviso de Política de Seguridad Activa */}
      <div className="p-4 rounded-[var(--radius-md)] border border-emerald-900/50 bg-emerald-950/20 text-xs leading-relaxed flex items-start gap-3">
        <ShieldCheck size={20} className="shrink-0 text-emerald-400 mt-0.5" />
        <div className="space-y-1">
          <div className="font-display font-bold text-emerald-300 flex items-center gap-2">
            <span>Seguridad Zero-Credential Activa</span>
            <span className="studio-badge !py-0.5 !px-2 text-emerald-400 border-emerald-800/50 bg-emerald-900/30">
              Protección de Privacidad
            </span>
          </div>
          <p className="text-slate-300">
            Por directivas de seguridad y para proteger tus credenciales contra filtraciones,{" "}
            <b>no solicitamos ni almacenamos tokens personales ni contraseñas de GitHub</b>. Puedes
            escanear libremente cualquier repositorio público ingresando su URL o nombre de proyecto.
            El análisis se ejecuta en un entorno temporal aislado en memoria con mitigación estricta
            contra ataques de evasión de directorios (Zip Slip).
          </p>
        </div>
      </div>

      {/* Error alert */}
      {githubError && (
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-rose-900/60 bg-rose-950/20 text-xs font-mono text-rose-300 flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">Error en el análisis de GitHub:</span> {githubError}
          </div>
        </div>
      )}

      {/* Panel Principal de Escaneo de Repositorio */}
      <div className="p-6 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--studio-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400">
              <GitHubIcon size={20} />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Analizador de Repositorios GitHub
              </h2>
              <p className="text-xs font-mono text-[var(--studio-text-secondary)]">
                Inspección estática de código multilingüe directo desde el repositorio
              </p>
            </div>
          </div>
          <span className="studio-badge text-blue-400 border-blue-900/40 bg-blue-950/20 self-start sm:self-auto">
            <Globe size={11} /> Conexión Directa a GitHub API
          </span>
        </div>

        {/* Formulario de Repositorio */}
        <form onSubmit={handleScan} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
                <span>URL o Propietario / Repositorio:</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Ej: NestorSnIbz/skinbridge-creator-tools
                </span>
              </label>
              <input
                type="text"
                value={publicUrlInput}
                onChange={(e) => setPublicUrlInput(e.target.value)}
                placeholder="https://github.com/propietario/repositorio o propietario/repositorio"
                className="w-full studio-input text-xs font-mono py-2.5"
                disabled={status === "loading"}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <GitBranch size={13} className="text-slate-400" />
                <span>Rama o Tag (Ref):</span>
              </label>
              <input
                type="text"
                value={branchInput}
                onChange={(e) => {
                  setBranchInput(e.target.value);
                  setSelectedBranch(e.target.value);
                }}
                placeholder="main / master"
                className="w-full studio-input text-xs font-mono py-2.5"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-[11px] font-mono text-[var(--studio-text-secondary)] flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              <span>Soporta cualquier lenguaje: TypeScript, JavaScript, Python, PHP, Java, etc.</span>
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !publicUrlInput.trim()}
              className="studio-btn-primary !text-xs !py-2.5 !px-5 w-full sm:w-auto shrink-0 !justify-center"
            >
              <Play size={13} fill="currentColor" />
              {status === "loading" ? "Descargando y analizando repositorio…" : "Escanear Repositorio Ahora"}
            </button>
          </div>
        </form>

        {/* Ejemplos de Proyectos para Pruebas Rápidas */}
        <div className="pt-4 border-t border-[var(--studio-border)] space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--studio-text-faint)]">
            Proyectos sugeridos para prueba inmediata:
          </span>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {POPULAR_EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => handlePickExample(ex.name)}
                className={`p-2.5 rounded-[var(--radius-sm)] border text-left transition-all ${
                  publicUrlInput === ex.name
                    ? "border-blue-500/70 bg-blue-950/30 text-white"
                    : "border-[var(--studio-border)] bg-[var(--studio-surface)] text-slate-300 hover:border-[var(--studio-border-bright)] hover:bg-[var(--studio-panel)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-white truncate">
                    {ex.name}
                  </span>
                  <span className="studio-badge !py-0 !px-1.5 text-[10px] text-blue-300 border-blue-900/40">
                    {ex.lang}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--studio-text-secondary)] truncate">
                  {ex.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matriz de Cobertura Multilingüe */}
      <div className="p-4 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-200">
          <Code2 size={14} className="text-blue-400" />
          <span>Lenguajes y Tecnologías Soportadas por el Motor SAST:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPPORTED_LANGS.map((lang) => (
            <div
              key={lang.name}
              className="p-2 rounded-[var(--radius-sm)] border border-[var(--studio-border)] bg-[var(--studio-surface)] text-[11px] font-mono"
            >
              <div className="text-slate-200 font-semibold">{lang.name}</div>
              <div className="text-[var(--studio-text-secondary)] text-[10px] truncate">{lang.exts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

