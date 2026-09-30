import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { type LucideIcon, Activity, AlertCircle, ArrowRight, ShieldCheck, Terminal, Lock, Mail } from "lucide-react";
import { useSastStore } from "../store/sast";
import { clsx } from "clsx";

function GoogleIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.1 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 35.9 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function LogoBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 grid place-items-center shrink-0">
        <Terminal size={18} className="text-white" strokeWidth={2.4} />
      </div>
      <div className={clsx(compact ? "" : "flex flex-col")}>
        <span className="font-display font-bold text-lg text-white tracking-tight leading-none">
          SAST Studio
        </span>
        {!compact && (
          <span className="text-xs text-[var(--studio-text-faint)] font-mono mt-1">
            Análisis Estático · OWASP Top 10
          </span>
        )}
      </div>
    </div>
  );
}

function Divider({ label = "O" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-[var(--studio-border)]" />
      <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--studio-text-faint)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--studio-border)]" />
    </div>
  );
}

const DEMO_CREDENTIALS: { role: string; email: string; password: string }[] = [
  { role: "Administrador", email: "admin@calidad.tech", password: "Admin123!" },
  { role: "Usuario Demo", email: "demo@calidad.tech", password: "Demo123!" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    authToken,
    currentUser,
    authLoading,
    authError,
    loginDemo,
    loginWithGoogle,
    handleOAuthCallbackFromUrl,
  } = useSastStore((s) => ({
    authToken: s.authToken,
    currentUser: s.currentUser,
    authLoading: s.authLoading,
    authError: s.authError,
    loginDemo: s.loginDemo,
    loginWithGoogle: s.loginWithGoogle,
    handleOAuthCallbackFromUrl: s.handleOAuthCallbackFromUrl,
  }));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Detectar si OAuth envía token por query params (callback URL)
  const hasOAuthParams = useMemo(() => {
    if (typeof window === "undefined") return false;
    const s = window.location.search || "";
    return s.includes("auth_token=") || s.includes("auth_error=");
  }, []);

  useEffect(() => {
    if (hasOAuthParams) {
      handleOAuthCallbackFromUrl()
        .then((r) => {
          if (r?.ok && r?.redirected) {
            // ya navegó
          }
        })
        .catch(() => {});
    }
  }, [hasOAuthParams, handleOAuthCallbackFromUrl]);

  // Si ya está autenticado, redirigir a home (o al `from` pendiente)
  const from =
    (location.state as any)?.from || (typeof window !== "undefined" ? window.location.search.split("next=")[1] : null) || "/";
  if (authToken && currentUser && !hasOAuthParams) {
    return <Navigate to={typeof from === "string" ? from : "/"} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError("Completa email y contraseña para continuar.");
      return;
    }
    if (!email.includes("@")) {
      setLocalError("Ingresa un correo electrónico válido.");
      return;
    }
    try {
      await loginDemo(email.trim(), password);
      navigate(typeof from === "string" && from.startsWith("/") ? from : "/", { replace: true });
    } catch (err: any) {
      setLocalError(err?.message || "No se pudo iniciar sesión.");
    }
  }

  function fillDemo(cred: (typeof DEMO_CREDENTIALS)[number]) {
    setEmail(cred.email);
    setPassword(cred.password);
    setLocalError(null);
  }

  const finalError = authError || localError;

  return (
    <div className="min-h-screen w-full bg-[var(--studio-bg)] text-[var(--studio-text)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Left panel: info */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-[var(--studio-border)] bg-[var(--studio-panel)]/40 backdrop-blur-sm">
          <LogoBrand />
          <div className="flex flex-col gap-6 max-w-md">
            <h1 className="font-display font-bold text-4xl xl:text-5xl tracking-tight leading-tight text-white">
              Consola de <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Seguridad</span>
            </h1>
            <p className="text-[var(--studio-text-secondary)] leading-relaxed">
              Detecta vulnerabilidades de OWASP Top 10, inyecciones SQL, fallos criptográficos y
              brechas de seguridad en tu código antes de desplegar.
            </p>
            <ul className="grid grid-cols-1 gap-3 text-sm">
              {([
                { title: "12 reglas OWASP / CWE", Icon: Activity, color: "text-blue-400" },
                { title: "Análisis de flujo Taint (Source → Sanitizer → Sink)", Icon: ShieldCheck, color: "text-emerald-400" },
                { title: "Exporta reportes JSON · SARIF 2.1 · HTML", Icon: Terminal, color: "text-violet-400" },
              ] as { title: string; Icon: LucideIcon; color: string }[]).map(({ title, Icon, color }, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--studio-surface)] border border-[var(--studio-border)]">
                  <div className={clsx("mt-0.5 shrink-0", color)}>
                    <Icon size={16} />
                  </div>
                  <span className="text-[var(--studio-text-secondary)]">{title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-[var(--studio-text-faint)] font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Motor SAST en línea · Versión 0.2.0
          </div>
        </div>

        {/* Right panel: form */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <LogoBrand />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
              Iniciar sesión
            </h2>
            <p className="text-sm text-[var(--studio-text-secondary)] mb-6">
              Accede a la consola con Google (1 clic, autocompleta tu cuenta) o usa una cuenta demo.
            </p>

            {finalError && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-400" />
                <span>{finalError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="w-full inline-flex items-center justify-center gap-3 h-12 px-5 rounded-[var(--radius-md)] bg-white text-slate-800 font-semibold text-sm hover:bg-slate-50 active:scale-[.99] transition shadow-sm disabled:opacity-60 border border-slate-200"
              disabled={authLoading}
            >
              <GoogleIcon size={20} />
              <span>Continuar con Google</span>
            </button>

            <div className="mt-2 text-center text-xs text-[var(--studio-text-faint)] font-mono">
              Más rápido — Google autocompleta tu perfil y correo.
            </div>

            <Divider />

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-1.5 inline-flex items-center gap-1.5">
                  <Mail size={12} />
                  Correo electrónico
                </span>
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLocalError(null); }}
                  placeholder="tu@correo.com"
                  className="studio-input h-11 w-full"
                  disabled={authLoading}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-1.5 inline-flex items-center gap-1.5">
                  <Lock size={12} />
                  Contraseña
                </span>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setLocalError(null); }}
                    placeholder="••••••••••"
                    className="studio-input h-11 w-full pr-20"
                    disabled={authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-semibold text-[var(--studio-text-secondary)] hover:text-white hover:bg-[var(--studio-surface)] transition"
                    tabIndex={-1}
                  >
                    {showPw ? "OCULTAR" : "VER"}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={authLoading}
                className="mt-1 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[var(--radius-md)] bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[.99]"
              >
                {authLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                <span>
                  {authLoading ? "Iniciando sesión…" : "Iniciar sesión"}
                </span>
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="text-xs font-semibold text-[var(--studio-text-secondary)] hover:text-blue-400 inline-flex items-center gap-1.5"
              >
                {showDemo ? "Ocultar" : "Ver"} credenciales de demostración
              </button>
              {showDemo && (
                <div className="mt-3 grid grid-cols-1 gap-2.5">
                  {DEMO_CREDENTIALS.map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onClick={() => fillDemo(c)}
                      className="group text-left p-3 rounded-lg bg-[var(--studio-surface)] border border-[var(--studio-border)] hover:border-blue-500/50 hover:bg-[var(--studio-surface)]/80 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">{c.role}</div>
                          <div className="font-mono text-xs text-[var(--studio-text-faint)] mt-0.5">
                            {c.email} · <span className="text-[var(--studio-text-secondary)]">{c.password}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition">
                          AUTOCOMPLETAR →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between text-xs text-[var(--studio-text-faint)] font-mono">
              <Link to="/about" className="hover:text-blue-400 transition">
                Acerca de SAST Studio
              </Link>
              <span>Sin cuenta? Contacta a tu administrador.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
