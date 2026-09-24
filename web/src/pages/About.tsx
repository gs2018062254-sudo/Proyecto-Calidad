import {
  Terminal,
  Workflow,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Code2,
  FileCode2,
  CheckCircle2,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";

const PIPELINE_STAGES = [
  {
    step: "01",
    title: "Parseo Sintáctico y Generación AST",
    subtitle: "Módulo python standard `ast`",
    icon: Terminal,
    desc: "El código fuente se descompone en un Árbol de Sintaxis Abstracta estructurado. Se registran las definiciones de funciones, asignaciones de variables (`Assign`, `AnnAssign`), importaciones de módulos y llamadas en tiempo de análisis sin ejecutar código del usuario.",
    badge: "AST Node Visitor",
  },
  {
    step: "02",
    title: "Mapeo de Flujo de Manchas (Taint Analysis)",
    subtitle: "Fuentes de entrada a sumideros peligrosos",
    icon: Workflow,
    desc: "Se identifican orígenes no confiables (Sources: `request.args`, `os.environ`, `sys.argv`, `input()`). El motor rastrea la propagación de estas variables a través de concatenaciones y asignaciones hasta alcanzar sinks de ejecución crítica (`eval`, `subprocess.Popen`, `cursor.execute`).",
    badge: "Source → Sink Tracking",
  },
  {
    step: "03",
    title: "Motor de Heurísticas y Reglas CWE",
    subtitle: "8 reglas especializadas",
    icon: Cpu,
    desc: "Cada nodo del AST se confronta con las 8 heurísticas de seguridad del motor. El algoritmo calcula un score de confianza (0.0 a 1.0) ponderando la presencia de desinfectantes, la distancia de flujo y los patrones de expresiones regulares.",
    badge: "Heuristic Scoring",
  },
  {
    step: "04",
    title: "Generación de Reportes Estándar",
    subtitle: "SARIF 2.1.0 & Formato Nativo JSON",
    icon: ShieldCheck,
    desc: "Los hallazgos se clasifican por severidad (Crítico, Alto, Medio, Bajo, Info). Cada elemento incorpora fragmento de código afectado, línea exacta, enlace normativo a CWE/OWASP y pasos de mitigación recomendados.",
    badge: "OASIS SARIF Compliant",
  },
];

const TECHNICAL_LIMITS = [
  {
    label: "Ámbito Intraprocedural",
    detail: "El rastreo de manchas (taint) se ejecuta dentro de cada función. No cruza fronteras entre diferentes invocaciones de funciones en módulos remotos.",
  },
  {
    label: "Evaluación Estática Pura",
    detail: "No se ejecuta código en tiempo de ejecución. Modificaciones dinámicas en tiempo de ejecución (`getattr`, `locals()`) no son resueltas dinámicamente.",
  },
  {
    label: "Ecosistema Python",
    detail: "La suite de análisis actual está optimizada exclusivamente para scripts y aplicaciones construidas en Python 3.8+.",
  },
  {
    label: "Análisis de Dependencias (SCA)",
    detail: "La herramienta examina vulnerabilidades en el código fuente propio. No sustituye herramientas de escaneo de dependencias transitivas en pip (CVEs en lockfiles).",
  },
];

export default function About() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--studio-border)]">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5">
          <Terminal size={14} />
          <span>ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA</span>
        </div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-white">
          Motor de Análisis Estático (SAST)
        </h1>
        <p className="text-xs sm:text-sm text-[var(--studio-text-secondary)] font-mono mt-2 leading-relaxed max-w-3xl">
          Arquitectura interna basada en Árboles de Sintaxis Abstracta (AST) de Python y grafos de propagación de flujo de datos contaminados (Taint Analysis).
        </p>
      </div>

      {/* Pipeline Stage Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-[var(--studio-text-secondary)] uppercase tracking-wider">
            Pipeline de Inspección
          </h2>
          <span className="text-[11px] font-mono text-[var(--studio-text-faint)]">
            4 etapas secuenciales
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.step} className="studio-panel flex flex-col justify-between">
                <div className="studio-panel-header">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                      {stage.step}
                    </span>
                    <h3 className="font-display font-semibold text-sm text-white">
                      {stage.title}
                    </h3>
                  </div>
                  <Icon size={16} className="text-blue-400 shrink-0" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] font-mono text-[var(--studio-text-faint)] mb-1">
                      {stage.subtitle}
                    </div>
                    <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--studio-border)] flex items-center justify-between">
                    <span className="studio-badge !text-[11px]">{stage.badge}</span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> 0 dependencias externas
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical Limitations Matrix */}
      <section className="studio-panel">
        <div className="studio-panel-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="font-display font-semibold text-sm text-white">
              Límites Técnicos y Alcance del Modelo
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[var(--studio-text-faint)]">
            Transparencia de auditoría
          </span>
        </div>
        <div className="p-5">
          <div className="grid md:grid-cols-2 gap-4">
            {TECHNICAL_LIMITS.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--studio-border)] bg-[var(--studio-surface)] space-y-1.5"
              >
                <div className="text-xs font-mono font-semibold text-amber-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {item.label}
                </div>
                <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Standards & Output Formats */}
      <section className="grid sm:grid-cols-3 gap-4">
        <div className="studio-panel p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-purple-400">
            <FileCode2 size={15} /> SARIF 2.1.0 (OASIS)
          </div>
          <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
            Formato estándar para integración en GitHub Code Scanning, Azure DevOps y SonarQube.
          </p>
        </div>

        <div className="studio-panel p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-400">
            <Database size={15} /> JSON Estructurado
          </div>
          <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
            Payload ligero con desglose de nodos AST, líneas de código y cadenas de propagación de datos.
          </p>
        </div>

        <div className="studio-panel p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400">
            <Code2 size={15} /> Reporte HTML Standalone
          </div>
          <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
            Documento autocontenido apto para entrega a clientes o auditorías de cumplimiento ISO 27001.
          </p>
        </div>
      </section>

      {/* Navigation CTA */}
      <section className="studio-panel p-5 bg-[var(--studio-surface)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-base text-white mb-1">
              ¿Listo para auditar código?
            </h3>
            <p className="text-xs text-[var(--studio-text-secondary)]">
              Accede directamente al entorno de análisis o examina las heurísticas en el catálogo de reglas.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/rules" className="studio-btn-secondary !text-xs !py-2">
              Ver reglas
            </Link>
            <Link to="/" className="studio-btn-primary !text-xs !py-2">
              Abrir consola <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
