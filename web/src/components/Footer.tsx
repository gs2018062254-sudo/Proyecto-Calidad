import { Shield, ExternalLink, Heart, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="max-w-[1280px] mx-auto px-6 py-10 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-neon-emerald to-neon-cyan grid place-items-center text-night-900">
              <Shield size={16} strokeWidth={2.6} />
            </div>
            <span className="font-display font-bold text-white">
              SAST Studio
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            Analizador estático de vulnerabilidades de código Python en el
            navegador. Basado en análisis de AST y rastreo de flujo de datos
            (taint source → sink).
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
            Motor
          </div>
          <ul className="text-sm space-y-1.5 text-slate-300">
            <li>• Parseo AST Python (stdlib ast)</li>
            <li>• Taint analysis: input/request → sinks SQL/OS/Path/HTML</li>
            <li>• 8 reglas: SQLi, RCE, Path, XSS, Secrets, Crypto…</li>
            <li>• Exporta JSON · SARIF 2.1 · HTML standalone</li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
            Stack
          </div>
          <div className="flex flex-wrap gap-2">
            {["Python 3", "Flask", "React 18", "Vite 5", "Tailwind 3", "CodeMirror", "Zustand"].map(
              (t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ),
            )}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <a
              className="btn-ghost !py-2"
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
            >
              <Code2 size={14} /> GitHub
              <ExternalLink size={11} className="opacity-60" />
            </a>
            <div className="text-xs text-slate-500 ml-auto">
              Hecho con <Heart size={11} className="inline text-neon-pink" />{" "}
              Python + React
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SAST Studio · Open source ·{" "}
        <span className="text-slate-400">Versión 0.1.0</span>
      </div>
    </footer>
  );
}
