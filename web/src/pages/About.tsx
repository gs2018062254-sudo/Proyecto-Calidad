import {
  Info,
  ShieldCheck,
  GitBranch,
  AlertTriangle,
  Cpu,
  Workflow,
  ArrowRight,
  Terminal,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: <Terminal size={18} />,
    title: "Parseo AST",
    desc: "El código fuente se convierte en un árbol sintáctico abstracto (AST) usando el módulo `ast` de Python stdlib. Se extraen imports, asignaciones, llamadas a funciones y definiciones.",
  },
  {
    step: 2,
    icon: <Workflow size={18} />,
    title: "Taint Analysis",
    desc: "Construimos un grafo de propagación `source → propagators → sink`. Las sources son entradas del usuario (request, input, environ, json.loads…). Los sinks son funciones peligrosas (execute, os.system, open, render_template_string…).",
  },
  {
    step: 3,
    icon: <Cpu size={18} />,
    title: "Motor de reglas",
    desc: "8 reglas especializadas analizan patrones AST, cadenas hardcodeadas y taint flows. Cada hallazgo recibe una confianza (0–1) basada en heurísticas y distancia del flujo.",
  },
  {
    step: 4,
    icon: <ShieldCheck size={18} />,
    title: "Reporte accionable",
    desc: "Los findings se ordenan por severidad y confianza. Incluyen evidencia, data-flow paso a paso, enlaces CWE y recomendación concreta para mitigar.",
  },
];

const LIMITATIONS = [
  "Análisis estático sintáctico: no resuelve valores en runtime ni sigue ejecución condicional compleja.",
  "Sin análisis interprocedural: los taints no cruzan fronteras de función llamada.",
  "Soporte inicial solo para Python. Otros lenguajes planeados.",
  "Pueden existir falsos positivos/negativos. Siempre valida manualmente cada hallazgo.",
  "Sin análisis de dependencias de terceros (SCA) ni configuración de infraestructura (IaC).",
];

export default function About() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-neon-violet/10 border border-neon-violet/30 px-3.5 py-1 mb-5">
          <Info size={14} className="text-neon-violet" />
          <span className="text-[12px] font-semibold tracking-wider uppercase text-neon-violet">
            Acerca del proyecto
          </span>
        </div>
        <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-white">
          Cómo funciona <span className="gradient-text">SAST Studio</span>
        </h1>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Un analizador estático open-source diseñado para enseñar y detectar
          vulnerabilidades comunes en código Python, con un enfoque en
          claridad, accionabilidad y cero fricción.
        </p>
      </div>

      {/* HOW IT WORKS */}
      <section className="mb-14">
        <h2 className="font-display font-bold text-2xl text-white mb-5 flex items-center gap-2">
          <GitBranch size={20} className="text-neon-cyan" /> Flujo de análisis
        </h2>
        <ol className="grid md:grid-cols-2 gap-4">
          {HOW_IT_WORKS.map((item, i) => (
            <li
              key={item.step}
              className="glass-surface rounded-2xl p-5 relative animate-fadeup"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-neon-emerald/20 to-neon-cyan/20 border border-white/10 grid place-items-center text-neon-emerald shadow-neon-sm">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] font-bold text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded">
                      STEP {item.step}
                    </span>
                    <h3 className="font-display font-semibold text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* LIMITATIONS */}
      <section className="mb-14">
        <h2 className="font-display font-bold text-2xl text-white mb-5 flex items-center gap-2">
          <AlertTriangle size={20} className="text-neon-yellow" /> Limitaciones
          y transparencia
        </h2>
        <div className="glass-surface rounded-2xl p-6">
          <ul className="space-y-3">
            {LIMITATIONS.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 animate-fadeup"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-neon-yellow/15 text-neon-yellow grid place-items-center text-xs font-bold">
                  !
                </span>
                <span className="text-slate-300 leading-relaxed text-[14px]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-10">
        <div className="glass-surface rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-glow opacity-60 pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="font-display font-bold text-2xl text-white mb-2">
                ¿Listo para probarlo?
              </h3>
              <p className="text-slate-400">
                Sube tu código Python o carga el demo integrado para ver el
                análisis en acción en menos de 2 segundos.
              </p>
            </div>
            <div className="flex md:justify-end gap-3 flex-wrap">
              <a href="/" className="btn-neon !py-3">
                Ir al analizador <ArrowRight size={15} />
              </a>
              <a href="/rules" className="btn-ghost !py-3">
                Ver reglas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CREDITS */}
      <section className="text-center text-xs text-slate-500">
        Hecho con Python · Flask · React 18 · Vite · Tailwind · Zustand ·
        CodeMirror · Lucide <br />
        Versión <span className="text-slate-400 font-mono">0.1.0</span> ·
        Código disponible en GitHub
      </section>
    </div>
  );
}
