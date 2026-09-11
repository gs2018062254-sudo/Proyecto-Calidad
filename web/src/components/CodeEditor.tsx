import { startTransition, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { useSastStore } from "../store/sast";
import { CheckCircle2, Sparkles } from "lucide-react";

export default function CodeEditor() {
  const value = useSastStore((s) => s.pasteValue);
  const setValue = useSastStore((s) => s.setPaste);
  const filename = useSastStore((s) => s.pasteFilename);
  const loadDemo = useSastStore((s) => s.loadDemo);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [justLoaded, setJustLoaded] = useState(false);

  // Escucha evento custom del store cuando loadDemo() se dispara desde fuera
  useEffect(() => {
    const onDemo = () => {
      startTransition(() => setJustLoaded(true));
      try {
        const raf = () =>
          rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof window !== "undefined") {
          window.setTimeout(() => window.requestAnimationFrame(raf), 0);
        }
      } catch {}
      const t = window.setTimeout(() => startTransition(() => setJustLoaded(false)), 3200);
      return () => window.clearTimeout(t);
    };
    window.addEventListener("sast:load-demo", onDemo);
    return () => window.removeEventListener("sast:load-demo", onDemo);
  }, []);

  const lines = value ? value.split("\n").length : 0;

  const handleLoad = () => {
    startTransition(() => setJustLoaded(true));
    try {
      const raf = () =>
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof window !== "undefined") {
        window.setTimeout(() => window.requestAnimationFrame(raf), 0);
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.setTimeout(() => startTransition(() => loadDemo()), 0);
    } else {
      startTransition(() => loadDemo());
    }
    window.setTimeout(() => startTransition(() => setJustLoaded(false)), 3200);
  };

  return (
    <div ref={rootRef} className="scroll-mt-24 animate-fade-up">
      <div className="rounded-2xl overflow-hidden border border-surface-200 bg-white shadow-card card-hover relative">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 bg-surface-50">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
          </div>
          <div className="text-xs text-surface-500 truncate font-mono font-semibold">
            {filename || "source.py"}
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="chip chip-gray !py-0.5 !text-[10px] !px-2 font-mono">
              {lines} líneas
            </span>
            {justLoaded && (
              <span className="chip chip-green !py-0.5 !text-[10px] !px-2 inline-flex items-center gap-1 animate-fade-up">
                <CheckCircle2 size={10} /> Demo cargado
              </span>
            )}
            <button
              type="button"
              onClick={handleLoad}
              className="px-3 py-1.5 rounded-xl text-[12px] font-bold transition bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 hover:text-primary-800 shadow-soft inline-flex items-center gap-1.5 active:scale-95"
              title="Rellena el editor con un Flask app con 11 vulnerabilidades reales para probar todas las reglas (SQLi, RCE, Secrets, XSS, Pickle, Path, WeakCrypto…)"
            >
              <Sparkles size={13} /> Cargar ejemplo demo
            </button>
          </div>
        </div>
        <CodeMirror
          value={value}
          height="460px"
          extensions={[python()]}
          placeholder={`# Pega tu código Python aquí y pulsa "Analizar"\n#\n# Ejemplo rápido:\n# username = input("Usuario: ")\n# query = "SELECT * FROM users WHERE name = '" + username + "'"\n# cursor.execute(query)\n#\n# 💡 Consejo: clica en "Cargar ejemplo demo" para ver TODAS las detecciones a la vez.`}
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
    </div>
  );
}
