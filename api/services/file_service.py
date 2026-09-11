# -*- coding: utf-8 -*-
"""Servicio de gestión de archivos temporales y descompresión para escaneo."""

from __future__ import annotations

import io
import os
import shutil
import tempfile
import zipfile
from typing import Dict, List, Tuple

MAX_TOTAL_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTS = {".py", ".pyw", ".zip"}
EXCLUDED_DIR_NAMES = {".git", "__pycache__", "node_modules", "venv", ".venv"}


class FileService:
    """Maneja la recepción, validación y descompresión segura de archivos de código."""

    @staticmethod
    def extract_zip_bytes(zip_bytes: bytes, tmpdir: str) -> List[str]:
        """Extrae archivos .py/.pyw de un archivo ZIP ignorando directorios irrelevantes."""
        extracted: List[str] = []
        try:
            zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
        except zipfile.BadZipFile:
            return extracted

        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if any(seg in EXCLUDED_DIR_NAMES for seg in name.split("/")):
                continue
            if not name.lower().endswith((".py", ".pyw")):
                continue

            target = os.path.join(tmpdir, info.filename)
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
            ext = os.path.splitext(name)[1].lower()
            if ext not in ALLOWED_EXTS:
                continue

            data = f.read()
            if len(data) > MAX_TOTAL_SIZE:
                continue

            if ext == ".zip":
                cls.extract_zip_bytes(data, tmpdir)
            elif ext in {".py", ".pyw"}:
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
                if fn.lower().endswith((".py", ".pyw")):
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
