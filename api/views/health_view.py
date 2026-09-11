# -*- coding: utf-8 -*-
"""Vista / Serializador para el endpoint de salud."""

from typing import Any, Dict


class HealthView:
    """Serializa la respuesta de estado del servicio."""

    @staticmethod
    def render(sast_version: str = "0.1.0") -> Dict[str, Any]:
        return {
            "ok": True,
            "sast_version": sast_version,
            "engine": "ready",
        }
