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
          "p-8 md:p-10 text-center overflow-hidden bg-white",
          dragging
            ? "border-primary-500 bg-primary-50/60 shadow-card"
            : "border-surface-200 hover:border-primary-300 hover:bg-surface-50",
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

        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 grid place-items-center text-primary-700 mb-4 shadow-soft">
          <CloudUpload size={30} strokeWidth={1.8} />
        </div>
        <div className="font-display font-semibold text-surface-900 text-lg">
          Arrastra tu archivo aquí
        </div>
        <div className="text-sm text-surface-500 mt-1.5">
          o haz clic para{" "}
          <span className="text-primary-700 font-semibold">seleccionar archivo</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="chip chip-blue">.py</span>
          <span className="chip chip-purple">.pyw</span>
          <span className="chip chip-gray">≤ 5 MB</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-surface-700">
              Archivos ({files.length})
            </div>
            <button
              className="text-[12px] text-surface-500 hover:text-danger-600 transition-colors font-semibold"
              onClick={clearFiles}
            >
              Limpiar
            </button>
          </div>
          <div className="grid gap-2 max-h-56 overflow-auto scrollbar-thin pr-1">
            {files.map((f, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-3 py-2 hover:border-primary-200 hover:bg-primary-50/40 transition"
              >
                <FileCode
                  size={16}
                  className="shrink-0 text-primary-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-surface-800 font-semibold">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-surface-500">
                    {formatBytes(f.size)}
                  </div>
                </div>
                <button
                  className="text-surface-400 hover:text-danger-600 transition opacity-0 group-hover:opacity-100"
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
