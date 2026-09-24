# -*- coding: utf-8 -*-
"""Controlador base con métodos auxiliares para respuestas HTTP."""

from typing import Any, Dict, Tuple
from flask import jsonify, Response


class BaseController:
    """Provee métodos comunes de respuesta para los controladores de la API."""

    @staticmethod
    def success(data: Dict[str, Any], status: int = 200) -> Tuple[Response, int]:
        return jsonify(data), status

    @staticmethod
    def error(message: str, status: int = 400) -> Tuple[Response, int]:
        return jsonify({"ok": False, "error": message}), status
