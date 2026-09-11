import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useSastStore } from "../store/sast";
import { CheckCircle2, Sparkles } from "lucide-react";

const PLACEHOLDER = `# Pega tu código Python aquí y pulsa "Analizar"
#
# Ejemplo rápido:
# username = input("Usuario: ")
# query = "SELECT * FROM users WHERE name = '" + username + "'"
# cursor.execute(query)
#
# 💡 Consejo: clica en "Cargar ejemplo demo" para ver TODAS las detecciones a la vez.`;

export default function CodeEditor() {
  const value = useSastStore((s) => s.pasteValue);
  const setValue = useSastStore((s) => s.setPaste);
  const filename = useSastStore((s) => s.pasteFilename);
  const loadDemo = useSastStore((s) => s.loadDemo);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const [justLoaded, setJustLoaded] = useState(false);

  useEffect(() => {
    const onDemo = () => {
      setJustLoaded(true);
      try {
        const raf = () =>
          rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof window !== "undefined") {
          window.setTimeout(() => window.requestAnimationFrame(raf), 0);
        }
      } catch {}
      const t = window.setTimeout(() => setJustLoaded(false), 3200);
      return () => window.clearTimeout(t);
    };
    window.addEventListener("sast:load-demo", onDemo);
    return () => window.removeEventListener("sast:load-demo", onDemo);
  }, []);

  const lines = useMemo(() => (value ? value.split("\n").length : 0), [value]);

  const gutterContent = useMemo(() => {
    const n = Math.max(1, lines);
    let out = "";
    for (let i = 1; i <= n; i++) out += i + "\n";
    return out;
  }, [lines]);

  const handleLoad = () => {
    setJustLoaded(true);
    try {
      const raf = () =>
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof window !== "undefined") {
        window.setTimeout(() => window.requestAnimationFrame(raf), 0);
      }
    } catch {}
    startTransition(() => loadDemo());
    window.setTimeout(() => setJustLoaded(false), 3200);
  };

  const onScroll = () => {
    if (taRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    startTransition(() => setValue(e.target.value, filename));
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
        <div className="flex" style={{ height: 460 }}>
          <div
            ref={gutterRef}
            className="select-none overflow-hidden bg-surface-50 border-r border-surface-100 text-right text-[11px] leading-6 text-surface-400 font-mono py-3 px-2 whitespace-pre"
            style={{ minWidth: 52, width: 52 }}
          >
            {gutterContent}
          </div>
          <textarea
            ref={taRef}
            value={value}
            placeholder={PLACEHOLDER}
            onChange={onChange}
            onScroll={onScroll}
            spellCheck={false}
            className="flex-1 resize-none outline-none bg-white text-[13px] leading-6 font-mono font-normal text-surface-800 placeholder:text-surface-300 p-3 whitespace-pre"
            wrap="off"
          />
        </div>
        <div className="px-4 py-2 border-t border-surface-100 bg-surface-50 text-[11px] text-surface-500 flex items-center justify-between">
          <span className="font-mono">Líneas: {lines}</span>
          <span className="font-mono">Python · {filename || "source.py"}</span>
        </div>
      </div>
    </div>
  );
}
