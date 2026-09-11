import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Trash2 } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  info?: ErrorInfo;
}

function cleanCorruptedState() {
  if (typeof window === "undefined") return;
  try {
    const keys = ["sast.history.v1", "sast.options.v1"];
    for (const k of keys) {
      try {
        const raw = window.localStorage.getItem(k);
        if (raw) JSON.parse(raw);
      } catch {
        window.localStorage.removeItem(k);
      }
    }
  } catch {}
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ERROR BOUNDARY:", error, info);
    try {
      cleanCorruptedState();
    } catch {}
  }

  private handleReset = () => {
    cleanCorruptedState();
    this.setState({ hasError: false, error: undefined, info: undefined });
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.location.reload(), 50);
    }
  };

  private handleClearAll = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sast.history.v1");
        window.localStorage.removeItem("sast.options.v1");
      }
    } catch {}
    this.handleReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children ?? null;
    const e = this.state.error;

    return (
      <div className="min-h-screen bg-[var(--studio-bg)] text-[var(--studio-text)] flex items-center justify-center p-5 font-display">
        <div className="w-full max-w-xl studio-panel shadow-2xl border border-[var(--studio-border)]">
          <div className="studio-panel-header !bg-rose-950/20 border-b border-rose-900/30">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle size={18} />
              <h1 className="font-display font-bold text-sm tracking-wide text-rose-300">
                Fallo de Renderizado / Excepción en UI
              </h1>
            </div>
            <span className="text-[10px] font-mono text-rose-400/80 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
              FATAL ERROR
            </span>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
              Se produjo una excepción no controlada en el árbol de componentes de React. Esto ocurre habitualmente cuando existen datos residuales corruptos en almacenamiento local o sintaxis anómala en el buffer.
            </p>

            {e && (
              <div className="rounded-[var(--radius-sm)] border border-rose-900/50 bg-[var(--studio-surface)] p-3.5 space-y-2">
                <div className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                  Detalle del error
                </div>
                <div className="text-[12px] text-rose-300 font-mono break-words whitespace-pre-wrap leading-relaxed max-h-44 overflow-auto scrollbar-thin pr-1">
                  {String(e.name && e.message ? `${e.name}: ${e.message}` : e)}
                  {e.stack ? `\n\n${e.stack.split("\n").slice(1, 5).join("\n")}` : ""}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="studio-btn-primary justify-center text-xs py-2.5"
              >
                <RefreshCw size={14} /> Recargar consola
              </button>
              <button
                onClick={this.handleClearAll}
                className="studio-btn-secondary justify-center text-xs py-2.5 text-rose-400 hover:text-rose-300"
              >
                <Trash2 size={14} /> Limpiar caché y reiniciar
              </button>
            </div>

            <div className="pt-3 border-t border-[var(--studio-border)] flex items-center justify-between text-xs font-mono">
              <a
                href="/"
                onClick={(ev) => {
                  ev.preventDefault();
                  this.handleReset();
                }}
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
              >
                <Home size={13} /> Volver a la consola
              </a>
              <span className="text-[10px] text-[var(--studio-text-faint)]">
                SAST Studio v0.1.0
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
