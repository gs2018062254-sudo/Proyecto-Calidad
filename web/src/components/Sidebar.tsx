import { NavLink } from "react-router-dom";
import {
  Shield,
  Home,
  Code2,
  BookOpen,
  FileBarChart,
  History,
  Settings,
  Terminal,
  Activity,
  UserCheck,
} from "lucide-react";

const NAV = [
  { to: "/", end: true, label: "Consola de análisis", icon: Home },
  { to: "/analysis", label: "Editor de código", icon: Code2 },
  { to: "/rules", label: "Reglas de seguridad", icon: BookOpen },
  { to: "/reports", label: "Reportes SARIF", icon: FileBarChart },
  { to: "/history", label: "Registro de auditorías", icon: History },
  { to: "/settings", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-[250px] shrink-0 flex-col h-screen sticky top-0 border-r border-[var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] select-none">
      {/* Brand header */}
      <div className="px-5 py-4 border-b border-[var(--studio-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border-bright)] grid place-items-center text-blue-400">
            <Shield size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              SAST Studio
            </div>
            <div className="text-[11px] text-[var(--studio-text-secondary)] font-normal">
              Análisis Estático Python
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[11px] text-[var(--studio-text-faint)] font-medium">
          Módulos
        </div>
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `studio-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={16} strokeWidth={2} className="shrink-0 text-[var(--studio-text-secondary)]" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Telemetry Footer */}
      <div className="p-3 border-t border-[var(--studio-border)] bg-[var(--studio-bg)]/60 space-y-2.5">
        <div className="p-2.5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-surface)]">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Terminal size={12} /> Motor AST
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En línea
            </span>
          </div>
          <div className="text-[11px] text-[var(--studio-text-secondary)]">
            8 reglas activas · Taint flow
          </div>
        </div>

        {/* Auditor Profile */}
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--studio-text-secondary)]">
          <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] grid place-items-center text-slate-300">
            <UserCheck size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-slate-200 truncate">Sesión local</div>
            <div className="text-[10px] text-[var(--studio-text-faint)] truncate flex items-center gap-1">
              <Activity size={10} className="text-emerald-400" /> Flask MVC
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
