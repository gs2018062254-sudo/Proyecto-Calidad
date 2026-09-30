# -*- coding: utf-8 -*-
"""Fábrica de aplicación Flask (Application Factory)."""

import os
import sys
from pathlib import Path
from flask import Flask
from flask_cors import CORS

# Asegurar que la raíz del proyecto esté en sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

# Cargar variables de entorno desde .env (solo si existe / local dev)
try:
    from dotenv import load_dotenv  # type: ignore
    _env_path = Path(_PROJECT_ROOT) / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except Exception:
    pass  # python-dotenv opcional en producción (Vercel setea vars nativamente)

from .routes import api_bp
from .services.file_service import MAX_TOTAL_SIZE
from .services.auth_service import get_jwt_secret  # noqa: F401  (precachear)


def create_app() -> Flask:
    """Crea y configura la instancia de la aplicación Flask."""
    app = Flask(__name__)
    CORS(app, supports_credentials=False, origins="*", expose_headers=["WWW-Authenticate"])

    # Secret key para session (OAuth state storage) y fallback firmas
    default_secret = os.environ.get("JWT_SECRET", "sast-studio-dev-session-secret")
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY") or default_secret
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    # Upload size
    app.config["MAX_CONTENT_LENGTH"] = MAX_TOTAL_SIZE + 1024

    # Registrar rutas del Blueprint
    app.register_blueprint(api_bp)

    return app
