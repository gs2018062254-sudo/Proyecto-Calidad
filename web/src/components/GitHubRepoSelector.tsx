import { useState, useMemo } from "react";
import { useSastStore } from "../store/sast";
import {
  Key,
  ExternalLink,
  Search,
  RefreshCw,
  LogOut,
  Star,
  GitBranch,
  FolderGit2,
  Play,
  CheckCircle2,
  Lock,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
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
  { name: "pallets/flask", desc: "The Python micro framework for building web applications" },
  { name: "psf/requests", desc: "A simple, yet elegant, HTTP library for Python" },
  { name: "bottlepy/bottle", desc: "Fast and simple WSGI-framework for small web-applications" },
];

export default function GitHubRepoSelector() {
  const githubToken = useSastStore((s) => s.githubToken);
  const githubUser = useSastStore((s) => s.githubUser);
  const githubRepos = useSastStore((s) => s.githubRepos);
  const githubLoading = useSastStore((s) => s.githubLoading);
  const githubError = useSastStore((s) => s.githubError);
  const selectedRepo = useSastStore((s) => s.selectedRepo);
  const selectedBranch = useSastStore((s) => s.selectedBranch);
  const setSelectedRepo = useSastStore((s) => s.setSelectedRepo);
  const setSelectedBranch = useSastStore((s) => s.setSelectedBranch);
  const login = useSastStore((s) => s.loginGithubWithToken);
  const logout = useSastStore((s) => s.logoutGithub);
  const fetchRepos = useSastStore((s) => s.fetchGithubRepos);
  const runScan = useSastStore((s) => s.runGitHubScan);
  const status = useSastStore((s) => s.status);

  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [publicUrlInput, setPublicUrlInput] = useState("");
  const [publicBranchInput, setPublicBranchInput] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyPython, setOnlyPython] = useState(false);

  // Filtrar repositorios del usuario
  const filteredRepos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return githubRepos.filter((r) => {
      if (onlyPython && r.language?.toLowerCase() !== "python") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [githubRepos, searchQuery, onlyPython]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    await login(tokenInput.trim());
    setTokenInput("");
  };

  const handleScanPublic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicUrlInput.trim()) return;
    runScan(publicUrlInput.trim(), publicBranchInput.trim() || undefined);
  };

  return (
    <div className="p-5 space-y-6">
      {/* Error alert */}
      {githubError && (
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-rose-900/60 bg-rose-950/20 text-xs font-mono text-rose-300 flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">Error en GitHub:</span> {githubError}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESTADO 1: USUARIO AUTENTICADO CON GITHUB                */}
      {/* ======================================================== */}
      {githubToken && githubUser ? (
        <div className="space-y-5">
          {/* User Account Strip */}
          <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-surface)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="w-10 h-10 rounded-full border border-[var(--studio-border-bright)] object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white">
                    {githubUser.name || githubUser.login}
                  </span>
                  <a
                    href={githubUser.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                  >
                    @{githubUser.login} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
                  <span>{githubRepos.length} repositorios cargados</span>
                  <span className="mx-2 text-[var(--studio-border)]">|</span>
                  <span className="text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 size={11} /> Autenticado
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchRepos()}
                disabled={githubLoading}
                className="studio-btn-secondary !text-xs !py-1.5"
                title="Refrescar lista de repositorios"
              >
                <RefreshCw size={12} className={githubLoading ? "animate-spin" : ""} /> Sincronizar
              </button>
              <button
                type="button"
                onClick={logout}
                className="studio-btn-secondary !text-xs !py-1.5 text-rose-400 hover:text-rose-300 hover:border-rose-800/40"
              >
                <LogOut size={12} /> Desconectar
              </button>
            </div>
          </div>

          {/* Selected Repo Panel if any */}
          {selectedRepo && (
            <div className="p-4 rounded-[var(--radius-md)] border border-blue-900/50 bg-blue-950/15 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      PROYECTO SELECCIONADO:
                    </span>
                    <span className="font-display font-bold text-base text-white">
                      {selectedRepo.full_name}
                    </span>
                    {selectedRepo.private ? (
                      <span className="studio-badge text-amber-400 border-amber-900/40 bg-amber-950/20">
                        <Lock size={10} /> Privado
                      </span>
                    ) : (
                      <span className="studio-badge text-slate-300">
                        <Globe size={10} /> Público
                      </span>
                    )}
                  </div>
                  {selectedRepo.description && (
                    <p className="text-xs text-[var(--studio-text-secondary)] mt-1">
                      {selectedRepo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <GitBranch size={13} className="text-slate-400" />
                    <input
                      type="text"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      placeholder="main"
                      className="studio-input !py-1 !px-2 text-xs font-mono w-28"
                      title="Rama o tag de Git a escanear"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => runScan(selectedRepo.full_name, selectedBranch)}
                    disabled={status === "loading"}
                    className="studio-btn-primary !text-xs !py-1.5 shrink-0"
                  >
                    <Play size={12} fill="currentColor" /> Analizar este repo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nombre o descripción de repositorio..."
                className="w-full studio-input !pl-9 text-xs font-mono"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-mono text-[var(--studio-text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPython}
                onChange={(e) => setOnlyPython(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              Solo proyectos Python
            </label>
          </div>

          {/* Repositories Grid */}
          <div className="grid sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {githubLoading && githubRepos.length === 0 ? (
              <div className="sm:col-span-2 text-center py-10 text-xs font-mono text-[var(--studio-text-secondary)]">
                <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-blue-400" />
                Consultando repositorios en GitHub API…
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="sm:col-span-2 text-center py-8 rounded-[var(--radius-sm)] border border-[var(--studio-border)] bg-[var(--studio-surface)] text-xs text-[var(--studio-text-secondary)]">
                No se encontraron repositorios que coincidan con "{searchQuery}".
              </div>
            ) : (
              filteredRepos.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                const isPy = repo.language?.toLowerCase() === "python";
                return (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`p-3 rounded-[var(--radius-sm)] border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-950/30 border-blue-500/70 shadow-sm"
                        : "bg-[var(--studio-panel)] border-[var(--studio-border)] hover:border-[var(--studio-border-bright)] hover:bg-[var(--studio-surface)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-mono text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5">
                          <FolderGit2 size={13} className={isPy ? "text-blue-400" : "text-slate-500"} />
                          <span className="truncate">{repo.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {repo.private ? (
                            <span title="Repositorio Privado">
                              <Lock size={11} className="text-amber-400" />
                            </span>
                          ) : null}
                          <span className="text-[10px] font-mono text-[var(--studio-text-secondary)] flex items-center gap-0.5">
                            <Star size={10} /> {repo.stargazers_count}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--studio-text-secondary)] line-clamp-2 leading-relaxed">
                        {repo.description || "Sin descripción proporcionada."}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-[var(--studio-border)] flex items-center justify-between text-[10px] font-mono">
                      <span className={isPy ? "text-blue-400 font-semibold" : "text-slate-400"}>
                        {repo.language || "Código"}
                      </span>
                      <span className="text-[var(--studio-text-faint)]">
                        Rama: {repo.default_branch}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* ESTADO 2: NO AUTENTICADO (FORMULARIO TOKEN / URL PÚBLICA) */
        /* ======================================================== */
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            {/* Opción A: Autenticación con Personal Access Token */}
            <div className="p-4 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400">
                    <Key size={16} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">
                      Conectar cuenta de GitHub
                    </h3>
                    <p className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
                      Accede a tus proyectos públicos y privados
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed mt-2 mb-3">
                  Ingresa un <b>Personal Access Token</b> (clásico o fine-grained) con permiso de solo lectura sobre repositorios (<code className="text-blue-300 font-mono">repo:read</code>).
                </p>

                <form onSubmit={handleConnect} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full studio-input !pr-9 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={githubLoading || !tokenInput.trim()}
                    className="studio-btn-primary w-full !justify-center !text-xs !py-2"
                  >
                    <GitHubIcon size={14} />
                    {githubLoading ? "Verificando token…" : "Conectar cuenta"}
                  </button>
                </form>
              </div>

              <div className="pt-3 border-t border-[var(--studio-border)] text-[11px] font-mono text-[var(--studio-text-faint)] flex items-center justify-between">
                <span>¿No tienes token?</span>
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                >
                  Generar token en GitHub <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Opción B: Escaneo de repositorio público por URL */}
            <div className="p-4 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-emerald-400">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">
                      Escanear Repositorio Público
                    </h3>
                    <p className="text-[11px] font-mono text-[var(--studio-text-secondary)]">
                      Sin necesidad de iniciar sesión o ingresar token
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed mt-2 mb-3">
                  Introduce la URL de cualquier proyecto público de GitHub o su formato <code className="text-emerald-300 font-mono">propietario/repo</code> para analizar su código Python.
                </p>

                <form onSubmit={handleScanPublic} className="space-y-3">
                  <input
                    type="text"
                    value={publicUrlInput}
                    onChange={(e) => setPublicUrlInput(e.target.value)}
                    placeholder="https://github.com/pallets/flask"
                    className="w-full studio-input text-xs font-mono"
                  />

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <GitBranch size={13} className="text-slate-400" />
                      <input
                        type="text"
                        value={publicBranchInput}
                        onChange={(e) => setPublicBranchInput(e.target.value)}
                        placeholder="main / master"
                        className="studio-input text-xs font-mono w-full"
                        title="Rama o referencia de Git"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={status === "loading" || !publicUrlInput.trim()}
                      className="studio-btn-accent !text-xs !py-2 shrink-0"
                    >
                      <Play size={12} fill="currentColor" /> Analizar
                    </button>
                  </div>
                </form>
              </div>

              {/* Ejemplos rápidos */}
              <div className="pt-3 border-t border-[var(--studio-border)]">
                <div className="text-[11px] font-mono text-[var(--studio-text-faint)] mb-1.5">
                  Probar con proyectos de ejemplo:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_EXAMPLES.map((ex) => (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => {
                        setPublicUrlInput(ex.name);
                        setPublicBranchInput("main");
                      }}
                      className="studio-badge hover:text-white hover:border-blue-500/50 transition-colors"
                      title={ex.desc}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
