import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--studio-bg)] text-[var(--studio-text)]">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </main>
          <footer className="px-6 py-4 border-t border-[var(--studio-border)] bg-[var(--studio-panel)] text-xs text-[var(--studio-text-secondary)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div>
              SAST Studio · Análisis Estático Multilenguaje (AST & Flujo de Datos Taint)
            </div>
            <div className="flex items-center gap-4 text-[var(--studio-text-faint)] font-mono text-[11px]">
              <span>Motor Flask MVC (5001)</span>
              <span>Estándar SARIF 2.1</span>
              <span>12 reglas activas (CWE / OWASP)</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
