# -*- coding: utf-8 -*-
"""
Punto de entrada de la API SAST Web (Flask).
Compatible con:
  - Modo local / Server: `py server.py` o `py api/index.py` (puerto 5001)
  - Vercel serverless:  `/api/index.py` WSGI handler
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

# Garantizar que la raíz del proyecto esté en sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from api.app import create_app
from api.services.rules_service import RulesService

# Instancia principal de la aplicación Flask
app = create_app()


def get_engine(config=None):
    """Acceso compatible hacia atrás al motor SAST."""
    return RulesService.get_engine(config)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Adaptador para el runtime de Vercel Serverless (WSGI bridge)."""
    from werkzeug.wrappers import Request
    from werkzeug.middleware.proxy_fix import ProxyFix

    app_wsgi = ProxyFix(app)
    req = Request(event)
    resp = req.get_response(app_wsgi)
    body = resp.get_data()
    if isinstance(body, bytes):
        body = body.decode("utf-8", errors="replace")
    return {
        "statusCode": resp.status_code,
        "headers": dict(resp.headers),
        "body": body,
    }


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    port = int(os.environ.get("PORT", 5001))
    print(f"🛡️  SAST Web API corriendo en http://localhost:{port}/api/")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
