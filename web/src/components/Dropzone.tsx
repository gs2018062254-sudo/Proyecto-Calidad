import { useCallback, useRef, useState } from "react";
import { CloudUpload, FileCode, X } from "lucide-react";
import { useSastStore } from "../store/sast";
import clsx from "clsx";
import { formatBytes } from "../lib/severity";

export default function Dropzone() {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addFiles = useSastStore((s) => s.addNativeFiles);
  const files = useSastStore((s) => s.files);
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
          "relative cursor-pointer select-none rounded-2xl border-2 border-dashed transition-all",
          "p-8 md:p-10 text-center overflow-hidden",
          dragging
            ? "dropzone-active"
            : "border-white/10 bg-[rgba(255,255,255,0.02)] hover:border-white/20",
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
          accept=".py,.pyw,.zip"
          onChange={(e) => onFiles(e.target.files)}
        />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-[rgba(0,255,179,0.12)] grid place-items-center text-neon-emerald mb-4 shadow-neon-sm">
          <CloudUpload size={30} strokeWidth={1.8} />
        </div>
        <div className="font-display font-semibold text-white text-lg">
          Arrastra tus archivos aquí
        </div>
        <div className="text-sm text-slate-400 mt-1.5">
          o haz clic para{" "}
          <span className="text-neon-emerald font-medium">seleccionar archivos</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="chip">.py</span>
          <span className="chip">.pyw</span>
          <span className="chip">.zip (proyecto)</span>
          <span className="chip">≤ 5 MB</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="glass-surface rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">
              Archivos ({files.length})
            </div>
            <button
              className="text-xs text-slate-400 hover:text-neon-pink transition-colors"
              onClick={clearFiles}
            >
              Limpiar
            </button>
          </div>
          <div className="grid gap-2 max-h-56 overflow-auto scrollbar-thin pr-1">
            {files.map((f, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 hover:border-white/10 transition"
              >
                <FileCode
                  size={16}
                  className="shrink-0 text-neon-cyan"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-200 font-medium">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatBytes(f.size)}
                  </div>
                </div>
                <button
                  className="text-slate-500 hover:text-neon-pink transition opacity-0 group-hover:opacity-100"
                  onClick={() => removeFile(f.name)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
