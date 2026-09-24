# -*- coding: utf-8 -*-
"""Fábrica de aplicación Flask (Application Factory)."""

import sys
from pathlib import Path
from flask import Flask
from flask_cors import CORS

# Asegurar que la raíz del proyecto esté en sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from .routes import api_bp
from .services.file_service import MAX_TOTAL_SIZE


def create_app() -> Flask:
    """Crea y configura la instancia de la aplicación Flask."""
    app = Flask(__name__)
    CORS(app, supports_credentials=False, origins="*")
    app.config["MAX_CONTENT_LENGTH"] = MAX_TOTAL_SIZE + 1024

    # Registrar rutas del Blueprint
    app.register_blueprint(api_bp)

    return app
