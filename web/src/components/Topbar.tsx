import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, LogOut, Terminal, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { useSastStore } from "../store/sast";
import type { AuthUser } from "../types";

function InitialsAvatar({ user, size = 32 }: { user: AuthUser; size?: number }) {
  if (user.avatar_url) {
    return (
      <img
        width={size}
        height={size}
        src={user.avatar_url}
        alt={user.name}
        referrerPolicy="no-referrer"
        className={clsx(
          "rounded-full object-cover border border-[var(--studio-border)] shrink-0",
          `w-[${size}px] h-[${size}px]`,
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || user.email?.[0] || "U";
  const last = parts.length > 1 ? parts[1][0] : "";
  const letters = (first + last).toUpperCase().slice(0, 2);
  const palette = [
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-fuchsia-500 to-violet-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
  ];
  const idx = (user.name.length + (user.email?.length || 0)) % palette.length;
  return (
    <div
      className={clsx(
        "rounded-full grid place-items-center text-white font-bold shrink-0 border border-white/10",
        palette[idx],
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.42) }}
    >
      {letters}
    </div>
  );
}

export default function Topbar() {
  const navigate = useNavigate();
  const { currentUser, authToken, logout } = useSastStore((s) => ({
    currentUser: s.currentUser,
    authToken: s.authToken,
    logout: s.logout,
  }));

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--studio-border)] bg-[var(--studio-panel)]/95 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Scope / Engine title */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400 shrink-0">
            <Terminal size={15} strokeWidth={2} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-sm tracking-tight text-white">
              SAST Studio
            </span>
            <span className="text-[var(--studio-text-faint)] hidden sm:inline">/</span>
            <span className="text-xs text-[var(--studio-text-secondary)] hidden sm:inline font-mono">
              Consola de análisis
            </span>
          </div>
        </div>

        {/* Live Backend Telemetry & Quick Action + User Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Motor SAST</span>
            <span className="text-emerald-400">
              {authToken ? "Sesión activa" : "Offline"}
            </span>
          </div>

          <Link
            to="/rules"
            className="studio-btn-secondary !text-xs !py-1 !px-2.5 inline-flex items-center gap-1.5"
          >
            <Activity size={13} className="text-blue-400" />
            <span>12 reglas activas</span>
          </Link>

          {/* User avatar / session */}
          {currentUser && authToken ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                className={clsx(
                  "flex items-center gap-2 pl-1 pr-2 h-8 rounded-full bg-[var(--studio-surface)] border border-[var(--studio-border)] hover:border-blue-500/60 hover:bg-[var(--studio-surface)]/80 transition",
                  menuOpen && "border-blue-500/60",
                )}
              >
                <InitialsAvatar user={currentUser} size={26} />
                <span className="hidden md:block text-xs font-semibold text-[var(--studio-text-secondary)] pr-0.5">
                  {currentUser.name}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] shadow-2xl shadow-black/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3.5 border-b border-[var(--studio-border)] bg-[var(--studio-surface)]/60">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar user={currentUser} size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-xs text-[var(--studio-text-faint)] font-mono truncate">
                          {currentUser.email || currentUser.provider}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider",
                        currentUser.provider === "github"
                          ? "bg-slate-700/60 text-slate-200"
                          : "bg-blue-500/15 text-blue-300",
                      )}>
                        {currentUser.provider}
                      </span>
                      {currentUser.role && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-300">
                          {currentUser.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => navigate("/settings")}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-[var(--studio-text-secondary)] hover:bg-[var(--studio-surface)] hover:text-white transition"
                    >
                      <UserIcon size={15} />
                      <span>Mi perfil</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        try { await logout(); } catch {}
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition"
                    >
                      <LogOut size={15} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="studio-btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5"
            >
              <UserIcon size={13} />
              <span>Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
