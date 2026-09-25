import { useSastStore } from "../store/sast";
import { Settings as SettingsIcon, Save, RefreshCw, Trash2, Download, UploadCloud } from "lucide-react";

export default function Settings() {
  const options = useSastStore((s) => s.options);
  const setOption = useSastStore((s) => s.setOption);
  const clearHistory = useSastStore((s) => s.clearHistory);
  const reset = useSastStore((s) => s.reset);
  const history = useSastStore((s) => s.history);
  const exportJson = useSastStore((s) => s.exportJson);
  const exportSarif = useSastStore((s) => s.exportSarif);
  const exportHtml = useSastStore((s) => s.exportHtml);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--studio-border)]">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2.5">
            <SettingsIcon size={22} className="text-blue-400" />
            <span>Configuración de Análisis</span>
          </h1>
          <p className="text-xs text-[var(--studio-text-secondary)] font-mono mt-1">
            Preferencias del motor AST · Persistencia en navegador y sincronización reactiva
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="studio-badge !text-emerald-400 border-emerald-900/40 bg-emerald-950/20">
            <Save size={12} /> Auto-guardado en vivo
          </span>
        </div>
      </div>

      {/* Default Scan Engine Settings */}
      <section className="studio-panel">
        <div className="studio-panel-header">
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className="text-blue-400" />
            <h2 className="font-display font-semibold text-sm text-white">
              Parámetros del Motor de Inspección
            </h2>
          </div>
          <span className="text-[11px] text-[var(--studio-text-faint)] font-mono">
            Sincronización activa
          </span>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            {/* Conjunto de reglas */}
            <div>
              <label className="text-xs font-semibold text-[var(--studio-text-secondary)] block mb-2 font-mono">
                Conjunto de reglas
              </label>
              <select
                value={options.ruleset ?? "all"}
                onChange={(e) => setOption("ruleset", e.target.value)}
                className="studio-select w-full !text-xs !py-2.5"
              >
                <option value="all">Todas las reglas (12)</option>
                <option value="owasp">Solo OWASP Top 10 (10)</option>
                <option value="injection">Inyecciones únicamente (4)</option>
                <option value="secrets">Secretos y criptografía (3)</option>
              </select>
              <span className="text-[11px] text-[var(--studio-text-faint)] mt-1.5 block">
                Filtra qué heurísticas AST y reglas de propagación se ejecutan.
              </span>
            </div>

            {/* Severidad mínima */}
            <div>
              <label className="text-xs font-semibold text-[var(--studio-text-secondary)] block mb-2 font-mono">
                Severidad mínima requerida
              </label>
              <select
                value={options.min_severity}
                onChange={(e) => setOption("min_severity", e.target.value as typeof options.min_severity)}
                className="studio-select w-full !text-xs !py-2.5"
              >
                <option value="all">Todos los niveles (Info / Bajo / Medio / Alto / Crítico)</option>
                <option value="info">Info o superior</option>
                <option value="low">Bajo o superior</option>
                <option value="medium">Medio o superior</option>
                <option value="high">Alto o superior</option>
                <option value="critical">Solo Crítico</option>
              </select>
              <span className="text-[11px] text-[var(--studio-text-faint)] mt-1.5 block">
                Ignora hallazgos por debajo del umbral especificado.
              </span>
            </div>

            {/* Confianza mínima */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--studio-text-secondary)] font-mono">
                  Umbral de confianza mínima
                </label>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {Math.round(options.min_confidence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(options.min_confidence * 100)}
                onChange={(e) => setOption("min_confidence", Number(e.target.value) / 100)}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[var(--studio-surface)] rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-[var(--studio-text-faint)] font-mono mt-1.5">
                <span>0% (Permisivo)</span>
                <span>50%</span>
                <span>100% (Estricto)</span>
              </div>
            </div>

            {/* Excluir tests */}
            <div>
              <label className="text-xs font-semibold text-[var(--studio-text-secondary)] block mb-2 font-mono">
                Análisis de tests y suites de prueba
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOption("exclude_tests", !options.exclude_tests)}
                  className={`relative w-12 h-6 rounded-full transition-colors border ${
                    options.exclude_tests
                      ? "bg-[var(--studio-surface)] border-[var(--studio-border)]"
                      : "bg-blue-600 border-blue-500"
                  }`}
                  aria-pressed={!options.exclude_tests}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      options.exclude_tests ? "left-1" : "left-6"
                    }`}
                  />
                </button>
                <span className="text-xs font-mono text-[var(--studio-text)]">
                  {options.exclude_tests ? "Excluyendo carpetas test/" : "Analizando todo el código"}
                </span>
              </div>
              <span className="text-[11px] text-[var(--studio-text-faint)] mt-2 block">
                Omite o incluye ficheros de pruebas unitarias al escanear directorios.
              </span>
            </div>

            {/* Formatos de reporte */}
            <div className="md:col-span-2 pt-3 border-t border-[var(--studio-border)]">
              <label className="text-xs font-semibold text-[var(--studio-text-secondary)] block mb-2 font-mono">
                Formatos de exportación automática habilitados
              </label>
              <div className="flex flex-wrap gap-2">
                {(["sarif", "json", "html"] as const).map((f) => {
                  const active = options.report_formats.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        const set = new Set(options.report_formats);
                        set.has(f) ? set.delete(f) : set.add(f);
                        if (set.size === 0) set.add("json");
                        setOption("report_formats", Array.from(set));
                      }}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] border text-xs font-mono font-semibold transition ${
                        active
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[var(--studio-surface)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-white"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Local Storage & Actions */}
      <section className="studio-panel">
        <div className="studio-panel-header">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-400" />
            <h2 className="font-display font-semibold text-sm text-white">
              Datos Locales y Acciones
            </h2>
          </div>
          <span className="text-[11px] text-[var(--studio-text-faint)] font-mono">
            {history.length} {history.length === 1 ? "auditoría almacenada" : "auditorías almacenadas"}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
            Gestiona los registros de análisis guardados en este navegador o exporta de inmediato la sesión actual en estándares de seguridad de la industria.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button className="studio-btn-secondary w-full !justify-start !py-2.5" onClick={reset}>
              <RefreshCw size={14} className="text-blue-400" /> Reiniciar análisis en pantalla
            </button>
            <button
              className="studio-btn-secondary w-full !justify-start !py-2.5 text-rose-400 hover:text-rose-300 border-rose-950/60 hover:border-rose-800/60"
              onClick={clearHistory}
            >
              <Trash2 size={14} /> Limpiar registro de auditorías
            </button>
            <button className="studio-btn-secondary w-full !justify-start !py-2.5" onClick={exportJson}>
              <Download size={14} className="text-blue-400" /> Exportar JSON
            </button>
            <button className="studio-btn-secondary w-full !justify-start !py-2.5" onClick={exportSarif}>
              <UploadCloud size={14} className="text-purple-400" /> Exportar SARIF 2.1
            </button>
            <button className="studio-btn-secondary sm:col-span-2 w-full !justify-start !py-2.5" onClick={exportHtml}>
              <UploadCloud size={14} className="text-emerald-400" /> Exportar HTML
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
