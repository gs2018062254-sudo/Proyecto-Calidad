# -*- coding: utf-8 -*-
"""Controlador para el endpoint del catálogo de reglas."""

from flask import Response
from typing import Tuple

from .base_controller import BaseController
from ..services.rules_service import RulesService
from ..views.rules_view import RulesView


class RulesController(BaseController):
    """Maneja la consulta y listado de reglas de análisis disponibles."""

    @classmethod
    def list_rules(cls) -> Tuple[Response, int]:
        rules = RulesService.list_rules()
        data = RulesView.render(rules)
        return cls.success(data, 200)
