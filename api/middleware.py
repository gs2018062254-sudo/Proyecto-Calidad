# -*- coding: utf-8 -*-
"""Middleware de autenticación JWT para Flask.

Decorador @requires_auth:
  - Busca token en header Authorization: Bearer <token>
  - Si válido → inyecta g.current_user con el payload
  - Si inválido/faltante → responde HTTP 401 JSON

Nota: Los endpoints /api/health y /api/auth/* son públicos por diseño.
"""

from __future__ import annotations

from functools import wraps
from typing import Callable, Optional

from flask import g, jsonify, request

from .services.auth_service import verify_jwt


UNAUTHORIZED_MSG = "Se requiere autenticación para acceder a este recurso."
INVALID_TOKEN_MSG = "Token inválido o expirado. Inicia sesión nuevamente."


def _extract_bearer_token() -> Optional[str]:
    """Extrae el token JWT del header Authorization."""
    auth = request.headers.get("Authorization", "")
    if not auth or not isinstance(auth, str):
        return None
    parts = auth.split(None, 1)
    if len(parts) != 2:
        return None
    scheme, token = parts
    if scheme.lower() != "bearer":
        return None
    return token.strip() or None


def requires_auth(f: Callable):
    """Decorador para rutas protegidas con JWT."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _extract_bearer_token()
        if not token:
            resp = jsonify({"ok": False, "error": UNAUTHORIZED_MSG})
            resp.status_code = 401
            resp.headers["WWW-Authenticate"] = "Bearer realm=\"SAST Studio\""
            return resp

        payload = verify_jwt(token)
        if not payload:
            resp = jsonify({"ok": False, "error": INVALID_TOKEN_MSG})
            resp.status_code = 401
            return resp

        g.current_user = payload
        g.auth_token = token
        try:
            return f(*args, **kwargs)
        finally:
            pass

    return wrapper


__all__ = ["requires_auth"]
