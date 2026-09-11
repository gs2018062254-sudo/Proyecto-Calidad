# -*- coding: utf-8 -*-
"""Servicio de gestión de reglas y del motor SAST."""

from __future__ import annotations
from typing import Any, Dict, List, Optional

from sast.rules.engine import AnalyzerEngine, AnalyzerConfig

_engine: Optional[AnalyzerEngine] = None


class RulesService:
    """Administra la instancia del motor de análisis y el catálogo de reglas."""

    @staticmethod
    def get_engine(config: Optional[AnalyzerConfig] = None) -> AnalyzerEngine:
        global _engine
        if _engine is None or config is not None:
            _engine = AnalyzerEngine(config=config or AnalyzerConfig())
        elif config is not None:
            _engine.config = config
        return _engine

    @classmethod
    def list_rules(cls) -> List[Dict[str, Any]]:
        """Retorna la lista de todas las reglas de seguridad activas en el motor."""
        engine = cls.get_engine()
        return engine.list_rules()
