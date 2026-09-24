# -*- coding: utf-8 -*-
"""Controlador para el endpoint de escaneo de código."""

from __future__ import annotations

import time
from typing import Tuple
from flask import request, Response

from .base_controller import BaseController
from ..models.scan_request import ScanRequest
from ..services.file_service import FileService
from ..services.scan_service import ScanService
from ..views.scan_view import ScanView


class ScanController(BaseController):
    """Maneja la recepción, validación y ejecución de escaneos estáticos."""

    @classmethod
    def scan(cls) -> Tuple[Response, int]:
        t0 = time.perf_counter()
        tmpdir = None
        sources = {}

        try:
            # 1. Determinar el tipo de contenido y extraer datos de entrada
            if request.content_type and "multipart/form-data" in request.content_type:
                try:
                    min_confidence = float(request.form.get("min_confidence", request.args.get("min_confidence", 0.0)) or 0.0)
                except ValueError:
                    min_confidence = 0.0

                min_severity = request.form.get("min_severity", request.args.get("min_severity")) or None
                exclude_tests = (request.form.get("exclude_tests", request.args.get("exclude_tests", "true")) or "true").lower() not in {"false", "0", "no"}
                include_sarif = (request.form.get("include_sarif", "false")).lower() == "true"
                include_html = (request.form.get("include_html", "false")).lower() == "true"

                files = request.files.getlist("files")
                if files:
                    tmpdir, sources = FileService.save_uploaded_files(files)
                    target_name = tmpdir
                    source_text = None
                    filename = None
                else:
                    source_text = request.form.get("source")
                    filename = request.form.get("filename") or "untitled.py"
                    target_name = filename

            else:
                try:
                    payload = request.get_json(force=True, silent=True) or {}
                except Exception:
                    payload = {}

                source_text = payload.get("source")
                filename = payload.get("filename") or "untitled.py"
                try:
                    min_confidence = float(payload.get("min_confidence", 0.0) or 0.0)
                except (ValueError, TypeError):
                    min_confidence = 0.0
                min_severity = payload.get("min_severity")
                exclude_tests = bool(payload.get("exclude_tests", True))
                include_sarif = bool(payload.get("include_sarif", False))
                include_html = bool(payload.get("include_html", False))
                target_name = filename

            # 2. Construir el DTO ScanRequest
            scan_req = ScanRequest(
                source_text=source_text,
                filename=filename or "untitled.py",
                target_name=target_name,
                min_confidence=min_confidence,
                min_severity=min_severity,
                exclude_tests=exclude_tests,
                include_sarif=include_sarif,
                include_html=include_html,
                tmpdir=tmpdir,
                sources=sources,
            )

            # 3. Delegar la ejecución del análisis a ScanService (Model)
            result = ScanService.execute_scan(scan_req)

            if result is None:
                return cls.error("No se detectó código fuente válido para analizar.", 400)

            # 4. Delegar la serialización a ScanView (View)
            duration_ms = int((time.perf_counter() - t0) * 1000)
            response_data = ScanView.render(result, scan_req, duration_ms)

            return cls.success(response_data, 200)

        except Exception as exc:
            return cls.error(f"Error interno: {type(exc).__name__}: {exc}", 500)

        finally:
            # 5. Garantizar la limpieza de archivos temporales
            if tmpdir:
                FileService.cleanup_temp_dir(tmpdir)
