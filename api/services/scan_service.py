# -*- coding: utf-8 -*-
"""Servicio de orquestación de análisis estático de seguridad."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from sast.rules.engine import AnalyzerConfig
from sast.models.finding import Finding, ScanResult
from ..models.scan_request import ScanRequest
from .rules_service import RulesService


class ScanService:
    """Ejecuta y filtra análisis SAST sobre texto o directorios temporales."""

    SEVERITY_ORDER: Dict[str, int] = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
        "info": 4,
    }

    @classmethod
    def sev_order(cls, sev: str) -> int:
        return cls.SEVERITY_ORDER.get(sev.lower(), 99)

    @classmethod
    def filter_by_severity(cls, findings: List[Finding], min_sev: Optional[str]) -> List[Finding]:
        """Filtra los hallazgos según el umbral mínimo de severidad."""
        if not min_sev or min_sev == "all":
            return findings
        threshold = cls.sev_order(min_sev)
        return [f for f in findings if cls.sev_order(f.severity.value) <= threshold]

    @classmethod
    def execute_scan(cls, req: ScanRequest) -> Optional[ScanResult]:
        """
        Ejecuta el escaneo configurado en el ScanRequest y retorna el ScanResult resultante.
        Si no se detectó código válido, retorna None.
        """
        config = AnalyzerConfig()
        config.min_confidence = max(0.0, min(1.0, req.min_confidence))
        config.exclude_tests = req.exclude_tests

        engine = RulesService.get_engine(config)
        result: Optional[ScanResult] = None

        if req.source_text is not None:
            filename = req.filename or "untitled.py"
            findings = engine.scan_source(req.source_text, filename)
            result = ScanResult(target=req.target_name, files_scanned=1, findings=findings)
            result.end_time = datetime.now(timezone.utc).isoformat()
            req.sources[filename] = req.source_text
        elif req.tmpdir:
            result = engine.scan(req.tmpdir)
            if result is not None and not result.end_time:
                result.end_time = datetime.now(timezone.utc).isoformat()

        if result is None:
            return None

        result.findings = cls.filter_by_severity(result.findings, req.min_severity)
        return result
