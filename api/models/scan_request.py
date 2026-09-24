# -*- coding: utf-8 -*-
"""Modelos y DTOs para solicitudes de análisis."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class ScanRequest:
    """Representa los parámetros validados de una solicitud de escaneo."""
    source_text: Optional[str] = None
    filename: str = "untitled.py"
    target_name: str = "untitled.py"
    min_confidence: float = 0.0
    min_severity: Optional[str] = None
    exclude_tests: bool = True
    include_sarif: bool = False
    include_html: bool = False
    tmpdir: Optional[str] = None
    sources: Dict[str, str] = field(default_factory=dict)
