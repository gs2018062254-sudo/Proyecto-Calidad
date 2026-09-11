# -*- coding: utf-8 -*-
"""Vista / Serializador para el endpoint de catálogo de reglas."""

from typing import Any, Dict, List


class RulesView:
    """Serializa la respuesta del listado de reglas."""

    @staticmethod
    def render(rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "ok": True,
            "rules": rules,
        }
