import { NavLink } from "react-router-dom";
import {
  Shield,
  Home,
  Code2,
  BookOpen,
  FileBarChart,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  User,
} from "lucide-react";

const NAV = [
  { to: "/", end: true, label: "Inicio", icon: Home },
  { to: "/analysis", label: "Análisis", icon: Code2 },
  { to: "/rules", label: "Reglas", icon: BookOpen },
  { to: "/reports", label: "Reportes", icon: FileBarChart },
  { to: "/history", label: "Historial", icon: History },
  { to: "/settings", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-[250px] shrink-0 flex-col h-screen sticky top-0 border-r border-surface-200 bg-white">
      <div className="px-5 pt-6 pb-5 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center text-white shadow-pop">
            <Shield size={22} strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[16px] tracking-tight text-surface-900">
              Analizador de Vulnerabilidades
            </div>
            <div className="text-[11px] text-surface-500 leading-tight">
              Código más seguro,<br />proyectos más fuertes.
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item ${isActive ? "nav-item-active" : ""}`
            }
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 space-y-3 border-t border-surface-100">
        <div className="relative p-4 rounded-2xl overflow-hidden"
             style={{
               background:
                 "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #8b5cf6 100%)",
             }}
        >
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-white/15 grid place-items-center backdrop-blur mb-2">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div className="font-display font-bold text-white text-[14px] leading-tight">
              Tu código, más seguro
            </div>
            <div className="text-[11px] text-white/80 mt-1 leading-snug">
              Detecta riesgos antes de que sea tarde.
            </div>
          </div>
        </div>

        <button className="nav-item w-full">
          <div className="w-8 h-8 rounded-full bg-surface-100 grid place-items-center">
            <User size={16} className="text-surface-600" />
          </div>
          <div className="flex-1 text-left leading-tight">
            <div className="text-[13px] font-semibold text-surface-800">Invitado</div>
            <div className="flex items-center gap-1 text-[11px] text-surface-500">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
              Online
            </div>
          </div>
          <ChevronRight size={14} className="text-surface-400" />
        </button>
      </div>
    </aside>
  );
}
