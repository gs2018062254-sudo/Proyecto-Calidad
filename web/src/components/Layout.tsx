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
    <div className="min-h-screen bg-surface-50 text-surface-800">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 px-6 md:px-8 py-6 md:py-8">
            <Outlet />
          </main>
          <footer className="px-6 md:px-8 py-6 border-t border-surface-200 text-[12px] text-surface-500 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              © {new Date().getFullYear()} Analizador de Vulnerabilidades ·
              Hecho con Python + React · Versión 0.1.0
            </div>
            <div className="flex items-center gap-4">
              <span className="chip chip-gray">8 reglas</span>
              <span className="chip chip-green">Estático · AST + Taint</span>
              <span className="chip chip-blue">SARIF · JSON · HTML</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
