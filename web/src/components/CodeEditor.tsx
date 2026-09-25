import { useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { useSastStore } from "../store/sast";

export default function CodeEditor() {
  const value = useSastStore((s) => s.pasteValue);
  const setValue = useSastStore((s) => s.setPaste);
  const filename = useSastStore((s) => s.pasteFilename);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // Escucha evento custom del store cuando loadDemo() se dispara desde fuera
  useEffect(() => {
    const onDemo = () => {
      try {
        const raf = () =>
          rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof window !== "undefined") {
          window.setTimeout(() => window.requestAnimationFrame(raf), 0);
        }
      } catch {}
    };
    window.addEventListener("sast:load-demo", onDemo);
    return () => window.removeEventListener("sast:load-demo", onDemo);
  }, []);

  return (
    <div ref={rootRef} className="h-full w-full">
      <CodeMirror
        value={value}
        height="490px"
        theme={dracula}
        extensions={[python()]}
        placeholder={`# Pega tu código fuente aquí y pulsa "Analizar código"\n#\n# Ejemplo rápido:\n# username = input("Usuario: ")\n# query = "SELECT * FROM users WHERE name = '" + username + "'"\n# cursor.execute(query)\n#\n# O pulsa "Cargar demo" en la barra superior para cargar el caso de prueba completo.`}
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
        className="text-[13px] font-mono leading-relaxed"
      />
    </div>
  );
}
