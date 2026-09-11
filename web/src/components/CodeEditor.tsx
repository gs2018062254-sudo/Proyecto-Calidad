import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { useSastStore } from "../store/sast";

export default function CodeEditor() {
  const value = useSastStore((s) => s.pasteValue);
  const setValue = useSastStore((s) => s.setPaste);
  const filename = useSastStore((s) => s.pasteFilename);
  const loadDemo = useSastStore((s) => s.loadDemo);

  const lines = value ? value.split("\n").length : 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-200 bg-white shadow-soft">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 bg-surface-50">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
        </div>
        <div className="text-xs text-surface-500 truncate font-mono font-semibold">
          {filename || "source.py"}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip chip-gray !py-0.5 !text-[10px] !px-2 font-mono">
            {lines} líneas
          </span>
          <button
            type="button"
            onClick={() => {
              loadDemo();
            }}
            className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 hover:text-primary-800 shadow-soft inline-flex items-center gap-1.5"
            title="Carga un archivo demo con múltiples vulnerabilidades reales para probar el analizador"
          >
            ✨ Cargar ejemplo demo
          </button>
        </div>
      </div>
      <CodeMirror
        value={value}
        height="460px"
        extensions={[python()]}
        placeholder={`# Pega tu código Python aquí y pulsa "Analizar"\n#\n# Ejemplo rápido:\n# username = input("Usuario: ")\n# query = "SELECT * FROM users WHERE name = '" + username + "'"\n# cursor.execute(query)\n#\n# 💡 Consejo: clica en "Cargar ejemplo demo" para ver todas las detecciones.`}
        onChange={(v) => setValue(v, filename)}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
        }}
        className="text-[13px] font-mono"
        style={{ background: "#ffffff", color: "#0f172a" }}
      />
    </div>
  );
}
