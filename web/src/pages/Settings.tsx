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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <div className="label-title mb-2">Ajustes</div>
        <h1 className="section-title">Configuración global</h1>
        <p className="mt-2 text-[15px] text-surface-500 leading-relaxed max-w-2xl">
          Estos valores se aplican a todos los nuevos análisis y se guardan automáticamente en tu navegador (persistentes + sincronización en vivo entre pestañas).
        </p>
      </div>

      <section className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700">
            <SettingsIcon size={18} />
          </div>
          <div>
            <h2 className="font-display font-bold text-[18px] text-surface-900 leading-tight">
              Análisis por defecto
            </h2>
            <p className="text-[12px] text-surface-500 mt-0.5">
              Se guardan con live sync entre pestañas.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">
              Conjunto de reglas
            </label>
            <select
              value={options.ruleset ?? "all"}
              onChange={(e) => setOption("ruleset", e.target.value)}
              className="input-field"
            >
              <option value="all">Todas las reglas (8)</option>
              <option value="owasp">Solo OWASP Top 10</option>
              <option value="injection">Inyecciones únicamente</option>
              <option value="secrets">Secretos y criptografía</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">
              Severidad mínima
            </label>
            <select
              value={options.min_severity}
              onChange={(e) => setOption("min_severity", e.target.value as typeof options.min_severity)}
              className="input-field"
            >
              <option value="all">Todos (todos los niveles)</option>
              <option value="info">Info +</option>
              <option value="low">Bajo +</option>
              <option value="medium">Medio +</option>
              <option value="high">Alto +</option>
              <option value="critical">Solo críticos</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">
              Confianza mínima: {Math.round(options.min_confidence * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(options.min_confidence * 100)}
              onChange={(e) => setOption("min_confidence", Number(e.target.value) / 100)}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-[10px] text-surface-500 mt-1 font-medium">
              <span>0%</span>
              <span>50%</span>
              <span>100% (muy preciso)</span>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">
              Incluir tests y carpetas de prueba
            </label>
            <button
              type="button"
              onClick={() => setOption("exclude_tests", !options.exclude_tests)}
              className={`relative w-24 h-10 rounded-xl transition shrink-0 ${
                options.exclude_tests ? "bg-surface-300" : "bg-primary-500"
              }`}
              aria-pressed={!options.exclude_tests}
            >
              <span
                className={`absolute top-0.5 w-9 h-9 rounded-lg bg-white shadow-soft transition-all flex items-center justify-center text-[10px] font-bold ${
                  options.exclude_tests
                    ? "left-0.5 text-surface-500"
                    : "left-[calc(100%-38px)] text-primary-600"
                }`}
              >
                {options.exclude_tests ? "OFF" : "ON"}
              </span>
            </button>
          </div>
          <div className="md:col-span-2">
            <label className="text-[13px] font-semibold text-surface-700 block mb-2">
              Formatos de reporte incluidos automáticamente
            </label>
            <div className="flex flex-wrap gap-2">
              {(["sarif", "json", "html"] as const).map((f) => {
                const active = options.report_formats.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => {
                      const set = new Set(options.report_formats);
                      set.has(f) ? set.delete(f) : set.add(f);
                      if (set.size === 0) set.add("json");
                      setOption("report_formats", Array.from(set));
                    }}
                    className={`px-4 py-2 rounded-xl border text-[13px] font-semibold transition ${
                      active
                        ? "bg-primary-50 border-primary-500 text-primary-700 shadow-soft"
                        : "bg-white border-surface-200 text-surface-500 hover:bg-surface-50"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end">
          <span className="chip chip-green inline-flex items-center gap-1.5">
            <Save size={12} /> Auto-guardado · en vivo
          </span>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display font-bold text-[18px] text-surface-900 leading-tight mb-2">
          Datos y acciones
        </h2>
        <p className="text-[12px] text-surface-500 mb-4">
          Actualmente hay <b className="text-surface-800">{history.length}</b> entradas en historial.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <button className="btn-secondary w-full justify-start" onClick={reset}>
            <RefreshCw size={14} /> Reiniciar análisis actual
          </button>
          <button className="btn-secondary w-full justify-start" onClick={clearHistory}>
            <Trash2 size={14} /> Eliminar todo el historial
          </button>
          <button className="btn-secondary w-full justify-start" onClick={exportJson}>
            <Download size={14} /> Exportar actual (JSON)
          </button>
          <button className="btn-secondary w-full justify-start" onClick={exportSarif}>
            <UploadCloud size={14} /> Exportar actual (SARIF)
          </button>
          <button className="btn-secondary md:col-span-2 w-full justify-start" onClick={exportHtml}>
            <UploadCloud size={14} /> Exportar actual (HTML standalone)
          </button>
        </div>
      </section>
    </div>
  );
}
