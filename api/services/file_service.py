# -*- coding: utf-8 -*-
"""Servicio de gestión de archivos temporales y descompresión para escaneo."""

from __future__ import annotations

import io
import os
import shutil
import tempfile
import zipfile
from typing import Dict, List, Tuple

MAX_TOTAL_SIZE = 15 * 1024 * 1024  # 15 MB para repositorios de código
CODE_EXTENSIONS = {
    ".py", ".pyw",
    ".js", ".jsx", ".mjs", ".cjs",
    ".ts", ".tsx",
    ".html", ".htm", ".vue", ".svelte",
    ".php", ".phtml",
    ".java", ".kt",
    ".go",
    ".rb",
    ".c", ".cpp", ".cc", ".h", ".hpp", ".cs",
    ".sql",
    ".sh", ".bash", ".ps1",
    ".json", ".yml", ".yaml", ".xml", ".toml",
}
ALLOWED_EXTS = CODE_EXTENSIONS | {".zip"}
EXCLUDED_DIR_NAMES = {
    ".git", "__pycache__", "node_modules", "venv", ".venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", ".tox", ".eggs", "vendor",
}
EXCLUDED_FILE_NAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "skills-lock.json",
}


class FileService:
    """Maneja la recepción, validación y descompresión segura de archivos de código multilingüe."""

    @staticmethod
    def extract_zip_bytes(zip_bytes: bytes, tmpdir: str) -> List[str]:
        """
        Extrae archivos de código fuente de un archivo ZIP de forma segura.
        Incluye protección estricta contra ataques de Zip Slip y bombas de descompresión.
        """
        extracted: List[str] = []
        abs_tmpdir = os.path.abspath(tmpdir)

        try:
            zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
        except zipfile.BadZipFile:
            return extracted

        for info in zf.infolist():
            if info.is_dir():
                continue

            name = info.filename.replace("\\", "/")
            base_name = os.path.basename(name).lower()

            # Omitir directorios innecesarios o de dependencias
            if any(seg in EXCLUDED_DIR_NAMES for seg in name.split("/")):
                continue

            # Omitir archivos lockfile pesados
            if base_name in EXCLUDED_FILE_NAMES:
                continue

            # Comprobar extensión de código o archivo .env
            ext = os.path.splitext(name)[1].lower()
            is_env = base_name == ".env" or base_name.startswith(".env.")
            if ext not in CODE_EXTENSIONS and not is_env:
                continue

            # Mitigación estricta de Zip Slip (evitar que rutas con '../' escapen de tmpdir)
            target = os.path.abspath(os.path.join(tmpdir, info.filename))
            if not target.startswith(abs_tmpdir + os.sep) and target != abs_tmpdir:
                continue

            os.makedirs(os.path.dirname(target) or tmpdir, exist_ok=True)
            try:
                data = zf.read(info)
                if len(data) > 1024 * 1024:  # Evita bombas de descompresión (>1MB por archivo individual)
                    continue
                with open(target, "wb") as fh:
                    fh.write(data)
                extracted.append(target)
            except Exception:
                continue

        zf.close()
        return extracted

    @classmethod
    def save_uploaded_files(cls, files: list) -> Tuple[str, Dict[str, str]]:
        """
        Guarda los archivos subidos (archivos sueltos o zip) en una carpeta temporal segura.
        Retorna la ruta del directorio temporal y el diccionario de fuentes leídas {ruta: contenido}.
        """
        tmpdir = tempfile.mkdtemp(prefix="sast_upload_")
        sources: Dict[str, str] = {}

        for f in files:
            name = (getattr(f, "filename", "") or "").replace("\\", "/").split("/")[-1]
            base_name = name.lower()
            ext = os.path.splitext(name)[1].lower()
            is_env = base_name == ".env" or base_name.startswith(".env.")

            if ext not in ALLOWED_EXTS and not is_env:
                continue

            data = f.read()
            if len(data) > MAX_TOTAL_SIZE:
                continue

            if ext == ".zip":
                cls.extract_zip_bytes(data, tmpdir)
            elif ext in CODE_EXTENSIONS or is_env:
                target = os.path.join(tmpdir, name)
                try:
                    decoded = data.decode("utf-8", errors="replace")
                except Exception:
                    decoded = data.decode("latin-1", errors="replace")
                with open(target, "w", encoding="utf-8") as fh:
                    fh.write(decoded)
                sources[target] = decoded

        # Cargar fuentes de cualquier archivo extraído vía ZIP que no esté aún en sources
        for root, _, filenames in os.walk(tmpdir):
            for fn in filenames:
                ext = os.path.splitext(fn)[1].lower()
                is_env = fn.lower() == ".env" or fn.lower().startswith(".env.")
                if ext in CODE_EXTENSIONS or is_env:
                    p = os.path.join(root, fn)
                    if p not in sources:
                        try:
                            with open(p, "r", encoding="utf-8", errors="replace") as fh:
                                sources[p] = fh.read()
                        except Exception:
                            pass

        return tmpdir, sources

    @staticmethod
    def cleanup_temp_dir(tmpdir: str | None) -> None:
        """Elimina de forma segura el directorio temporal creado."""
        if tmpdir and os.path.exists(tmpdir):
            try:
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass
