# -*- coding: utf-8 -*-
"""Controlador para el endpoint de verificación de salud."""

from flask import Response
from typing import Tuple

from .base_controller import BaseController
from ..views.health_view import HealthView


class HealthController(BaseController):
    """Maneja la verificación de estado y salud del sistema SAST."""

    @classmethod
    def check_health(cls) -> Tuple[Response, int]:
        data = HealthView.render()
        return cls.success(data, 200)
