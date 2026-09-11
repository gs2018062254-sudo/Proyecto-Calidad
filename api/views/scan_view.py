# -*- coding: utf-8 -*-
"""Vista / Serializador para el endpoint de escaneo."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sast.models.finding import ScanResult
from sast.reports.json_report import JsonReporter
from sast.reports.html_report import HtmlReporter
from ..models.scan_request import ScanRequest


class ScanView:
    """Serializa los resultados de escaneo al formato JSON esperado por el frontend."""

    @classmethod
    def to_dict_findings(cls, result: ScanResult, sources: Dict[str, str]) -> List[Dict[str, Any]]:
        """Convierte los hallazgos en diccionarios e inyecta la línea de evidencia si falta."""
        out: List[Dict[str, Any]] = []
        for f in sorted(result.findings):
            d = f.to_dict()
            src = sources.get(f.file_path)
            if src and not d.get("evidence"):
                lines = src.splitlines()
                if 1 <= f.line <= len(lines):
                    d["evidence"] = lines[f.line - 1].rstrip()
            out.append(d)
        return out

    @classmethod
    def render(
        cls,
        result: ScanResult,
        req: ScanRequest,
        duration_ms: int,
    ) -> Dict[str, Any]:
        """Construye la respuesta completa según la interfaz ScanResponse."""
        findings_data = cls.to_dict_findings(result, req.sources)

        # Normalizar rutas de fuentes relativas a tmpdir o basename
        rel_sources: Dict[str, str] = {}
        for p, src in req.sources.items():
            if req.tmpdir and p.startswith(req.tmpdir):
                rel = os.path.relpath(p, req.tmpdir).replace("\\", "/")
                rel_sources[rel] = src
            else:
                rel_sources[os.path.basename(p)] = src

        # Normalizar file_path dentro de los hallazgos si son temporales
        for f in findings_data:
            fp = f.get("file_path", "")
            if req.tmpdir and fp.startswith(req.tmpdir):
                f["file_path"] = os.path.relpath(fp, req.tmpdir).replace("\\", "/")

        response: Dict[str, Any] = {
            "ok": True,
            "target": req.target_name,
            "files_scanned": result.files_scanned,
            "duration_ms": duration_ms,
            "sast_version": result.sast_version,
            "timestamp": result.end_time or datetime.now(timezone.utc).isoformat(),
            "timezone": "UTC",
            "filters_applied": {
                "min_confidence": float(req.min_confidence),
                "min_severity": req.min_severity,
                "exclude_tests": bool(req.exclude_tests),
                "include_sarif": req.include_sarif,
                "include_html": req.include_html,
            },
            "summary": result.summary,
            "findings": findings_data,
            "sources": rel_sources,
            "errors": result.errors[:20],
        }

        if req.include_sarif:
            try:
                response["sarif"] = JsonReporter().to_sarif(result)
            except Exception:
                pass

        if req.include_html:
            try:
                response["html_report"] = HtmlReporter().generate(result)
            except Exception:
                pass

        return response
