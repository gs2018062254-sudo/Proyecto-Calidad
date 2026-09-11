import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { useSastStore } from "../store/sast";

export default function CodeEditor() {
  const value = useSastStore((s) => s.pasteValue);
  const setValue = useSastStore((s) => s.setPaste);
  const filename = useSastStore((s) => s.pasteFilename);
  const loadDemo = useSastStore((s) => s.loadDemo);

  return (
    <div className="glass-surface rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-black/30">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <div className="text-xs text-slate-400 truncate">{filename}</div>
        <div className="ml-auto flex items-center gap-2">
          <button className="chip hover:text-neon-emerald" onClick={loadDemo}>
            ✨ Cargar ejemplo demo
          </button>
        </div>
      </div>
      <CodeMirror
        value={value}
        height="460px"
        extensions={[python()]}
        theme={dracula}
        placeholder={`# Pega tu código Python aquí y pulsa "Analizar"\n#\n# Ejemplo:\n# username = input("Usuario: ")\n# query = "SELECT * FROM users WHERE name = '" + username + "'"\n# cursor.execute(query)`}
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
      />
    </div>
  );
}
