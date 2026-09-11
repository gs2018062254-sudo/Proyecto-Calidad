import { Search, Bell } from "lucide-react";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-md">
      <div className="px-6 md:px-8 h-16 flex items-center gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"
          />
          <input
            type="text"
            placeholder="Buscar por archivo, regla o vulnerabilidad..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm bg-surface-50 border border-surface-200 text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 focus:bg-white transition-all"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-xl bg-surface-50 border border-surface-200 grid place-items-center text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors">
            <Bell size={18} strokeWidth={2} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger-500 ring-2 ring-white" />
          </button>

          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary-200 to-info-200 border border-surface-200 grid place-items-center text-primary-700 font-bold text-sm">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
