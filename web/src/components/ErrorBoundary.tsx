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
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-5 font-display">
        <div className="w-full max-w-xl card p-7 space-y-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-danger-50 border border-danger-100 grid place-items-center text-danger-600 shrink-0 animate-float">
              <AlertTriangle size={28} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black text-surface-900 leading-tight">
                Algo salió mal
              </h1>
              <p className="text-[13px] text-surface-500 mt-1.5 leading-relaxed">
                Detectamos un error al renderizar la aplicación. Esto suele ocurrir por
                estado persistido corrupto o un problema con el código pegado.
              </p>
            </div>
          </div>

          {e && (
            <div className="rounded-xl border border-danger-200 bg-danger-50/60 p-4 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-danger-700">
                Detalle del error
              </div>
              <div className="text-[13px] text-danger-800 font-mono break-words whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto scrollbar-thin pr-1">
                {String(e.name && e.message ? `${e.name}: ${e.message}` : e)}
                {e.stack ? `\n\n${e.stack.split("\n").slice(1, 5).join("\n")}` : ""}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={this.handleReset}
              className="btn-primary justify-center text-[13px] py-2.5"
            >
              <RefreshCw size={14} /> Recargar página
            </button>
            <button
              onClick={this.handleClearAll}
              className="px-4 py-2.5 rounded-xl text-[13px] font-bold bg-white border border-surface-200 text-surface-800 hover:bg-surface-50 shadow-soft transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Limpiar estado
            </button>
          </div>

          <a
            href="/"
            onClick={(ev) => {
              ev.preventDefault();
              this.handleReset();
            }}
            className="inline-flex items-center gap-1.5 text-[13px] text-primary-700 hover:text-primary-800 font-semibold"
          >
            <Home size={13} /> Volver al inicio
          </a>

          <div className="text-[11px] text-surface-400 border-t border-surface-100 pt-4 leading-relaxed">
            💡 Consejo: si el error persiste al pegar código, prueba con el botón{" "}
            <b>"Cargar ejemplo demo"</b> incluido en el editor.
          </div>
        </div>
      </div>
    );
  }
}
