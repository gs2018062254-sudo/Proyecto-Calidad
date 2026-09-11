import { Link, NavLink, useLocation } from "react-router-dom";
import { Shield, ScanLine, BookOpen, Info } from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
  const loc = useLocation();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
      isActive
        ? "bg-white/5 text-white"
        : "text-slate-300 hover:text-white hover:bg-white/5",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-night-900/70">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center gap-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          onClick={() => {
            if (loc.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-emerald to-neon-cyan grid place-items-center text-night-900 shadow-neon-sm">
            <Shield size={18} strokeWidth={2.6} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold tracking-tight text-[17px] text-white">
              SAST <span className="gradient-text">Studio</span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase">
              Static Application Security Testing
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          <NavLink to="/" end className={navCls}>
            <span className="inline-flex items-center gap-1.5">
              <ScanLine size={14} /> Analizador
            </span>
          </NavLink>
          <NavLink to="/rules" className={navCls}>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={14} /> Reglas
            </span>
          </NavLink>
          <NavLink to="/about" className={navCls}>
            <span className="inline-flex items-center gap-1.5">
              <Info size={14} /> Acerca
            </span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
