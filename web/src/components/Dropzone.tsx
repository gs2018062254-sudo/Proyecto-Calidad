import { useCallback, useRef, useState } from "react";
import { CloudUpload, FileCode, X } from "lucide-react";
import { useSastStore } from "../store/sast";
import clsx from "clsx";
import { formatBytes } from "../lib/severity";

export default function Dropzone() {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addFiles = useSastStore((s) => s.addNativeFiles);
  const files = useSastStore((s) => s.nativeFiles);
  const removeFile = useSastStore((s) => s.removeFile);
  const clearFiles = useSastStore((s) => s.clearFiles);

  const onFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list) return;
      const arr = Array.from(list);
      if (arr.length) await addFiles(arr);
    },
    [addFiles],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={clsx(
          "relative cursor-pointer select-none rounded-[var(--radius-md)] border border-dashed transition-all",
          "p-8 text-center overflow-hidden bg-[var(--studio-panel)]",
          dragging
            ? "border-blue-500 bg-blue-950/30"
            : "border-[var(--studio-border)] hover:border-[var(--studio-border-bright)] hover:bg-[var(--studio-surface)]",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as any)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".py,.pyw"
          onChange={(e) => onFiles(e.target.files)}
        />

        <div className="mx-auto w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] grid place-items-center text-blue-400 mb-2">
          <CloudUpload size={20} strokeWidth={1.8} />
        </div>
        <div className="font-display font-semibold text-white text-sm">
          Arrastra tu archivo Python aquí
        </div>
        <div className="text-xs text-[var(--studio-text-secondary)] mt-1">
          o haz clic para explorar en el sistema de archivos
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="studio-badge">.py</span>
          <span className="studio-badge">.pyw</span>
          <span className="studio-badge">Límite 5 MB</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="p-3 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">
              Archivos en cola ({files.length})
            </div>
            <button
              className="text-[11px] text-[var(--studio-text-secondary)] hover:text-rose-400 transition-colors font-mono"
              onClick={clearFiles}
            >
              Limpiar todos
            </button>
          </div>
          <div className="grid gap-1.5 max-h-56 overflow-auto pr-1">
            {files.map((f, i) => (
              <div
                key={i}
                className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--studio-border)] bg-[var(--studio-surface)] px-2.5 py-1.5 hover:border-[var(--studio-border-bright)] transition"
              >
                <FileCode
                  size={14}
                  className="shrink-0 text-blue-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-slate-200 font-mono">
                    {f.name}
                  </div>
                  <div className="text-[10px] text-[var(--studio-text-faint)] font-mono">
                    {formatBytes(f.size)}
                  </div>
                </div>
                <button
                  className="text-slate-500 hover:text-rose-400 transition opacity-0 group-hover:opacity-100 p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.name);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
