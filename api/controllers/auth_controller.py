# -*- coding: utf-8 -*-
"""Controlador de autenticación (OAuth GitHub + Demo + JWT Session).

Endpoints:
  GET  /api/auth/login            -> Redirige a GitHub OAuth
  GET  /api/auth/callback         -> Callback GitHub, emite JWT y redirect a frontend
  POST /api/auth/demo-login       -> Cuentas demo (email + password), retorna JWT
  GET  /api/auth/me               -> Datos del usuario actual (requiere auth)
  POST /api/auth/logout           -> 200 OK (frontend borra el token)
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from flask import current_app, g, jsonify, redirect, request, session, url_for

from ..controllers.base_controller import BaseController
from ..middleware import requires_auth
from ..services.auth_service import (
    AUTH_DEMO_USERS,
    exchange_github_code,
    find_demo_user_by_email,
    generate_jwt,
    generate_oauth_state,
    get_github_oauth_url,
    get_oauth_credentials,
    get_oauth_redirect_uri,
    user_to_public,
    verify_demo_password,
)


# Ruta del frontend a la que redirigir tras OAuth callback (con JWT en hash)
# En Vercel se sirve /index.html para todas las rutas no /api/*
def _frontend_base() -> str:
    """Detecta base URL del frontend (mismo origin que la request, quita /api/*)."""
    host = request.host or "localhost:5173"
    scheme = request.scheme
    # Si el host corresponde a Vercel/HTTPS mantenlo; local puerto API != Web
    if "localhost" in host or "127.0.0.1" in host:
        # Local: web corre por defecto en 5173; si la API es 5001 reescribimos
        if ":5001" in host:
            host = host.replace(":5001", ":5173", 1)
    return f"{scheme}://{host}"


class AuthController(BaseController):
    """Controlador con endpoints de autenticación (públicos excepto /me)."""

    # ------------------------------------------------------------------
    # GET /api/auth/login — Redirect a GitHub OAuth
    # ------------------------------------------------------------------
    @staticmethod
    def github_login() -> Any:
        client_id, _ = get_oauth_credentials()
        if not client_id:
            return BaseController.error(
                "OAuth GitHub deshabilitado. Configura GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en el servidor.",
                status=501,
            )
        state = generate_oauth_state()
        try:
            session["oauth_state"] = state
        except Exception:
            # Si Flask sessions no están disponibles (sin SECRET_KEY),
            # igual construimos la URL; state se verifica opcionalmente.
            pass

        # Construir redirect_uri para GitHub
        request_host = request.host
        redirect_uri = get_oauth_redirect_uri(request_host)
        oauth_url = get_github_oauth_url(state, redirect_uri)
        if not oauth_url:
            return BaseController.error(
                "No se pudo construir URL de autorización GitHub.",
                status=500,
            )
        return redirect(oauth_url)

    # ------------------------------------------------------------------
    # GET /api/auth/callback — GitHub OAuth callback
    # ------------------------------------------------------------------
    @staticmethod
    def github_callback() -> Any:
        code = request.args.get("code")
        state = request.args.get("state")
        error = request.args.get("error")

        if error:
            desc = request.args.get("error_description") or f"GitHub OAuth error: {error}"
            return AuthController._redirect_frontend_with_error(desc)

        if not code:
            return AuthController._redirect_frontend_with_error("No se recibió code de GitHub.")

        # Opcional: validar state si lo guardamos en session
        try:
            saved_state = session.pop("oauth_state", None)
            if saved_state and state and saved_state != state:
                return AuthController._redirect_frontend_with_error("State mismatch (posible CSRF).")
        except Exception:
            pass

        # Intercambiar code -> user
        redirect_uri = get_oauth_redirect_uri(request.host)
        user, err = exchange_github_code(code, redirect_uri)
        if err or not user:
            return AuthController._redirect_frontend_with_error(err or "No se pudo autenticar con GitHub.")

        token = generate_jwt(user)
        return AuthController._redirect_frontend_with_jwt(token, user)

    # ------------------------------------------------------------------
    # POST /api/auth/demo-login — Cuentas demo fallback
    # Body JSON: { email: string, password: string }
    # ------------------------------------------------------------------
    @staticmethod
    def demo_login() -> Any:
        payload: Dict[str, Any] = request.get_json(silent=True) or {}
        email = payload.get("email")
        password = payload.get("password")

        if not isinstance(email, str) or not isinstance(password, str):
            return BaseController.error(
                "Credenciales incompletas. Requerido 'email' y 'password'.",
                status=400,
            )

        user = find_demo_user_by_email(email)
        if not user or not verify_demo_password(user, password):
            return BaseController.error(
                "Credenciales inválidas. Revisa email y contraseña.",
                status=401,
            )

        token = generate_jwt(user)
        public_user = user_to_public(user)
        return jsonify({
            "ok": True,
            "token": token,
            "user": public_user,
            "auth_type": "demo",
            "expires_in_hours": 24,
        })

    # ------------------------------------------------------------------
    # GET /api/auth/me — requiere JWT válido
    # ------------------------------------------------------------------
    @staticmethod
    @requires_auth
    def me() -> Any:
        user = getattr(g, "current_user", None)
        if not user:
            return BaseController.error("Sesión inválida.", status=401)
        return jsonify({
            "ok": True,
            "user": {
                "sub": user.get("sub"),
                "email": user.get("email"),
                "name": user.get("name"),
                "avatar_url": user.get("avatar_url", ""),
                "provider": user.get("provider", "unknown"),
                "role": user.get("role", "user"),
            },
        })

    # ------------------------------------------------------------------
    # POST /api/auth/logout — Stateless; responde OK, frontend borra token
    # ------------------------------------------------------------------
    @staticmethod
    def logout() -> Any:
        # Limpiar cualquier cookie de session si existe
        try:
            session.clear()
        except Exception:
            pass
        return jsonify({"ok": True, "message": "Sesión cerrada correctamente."})

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------
    @staticmethod
    def _redirect_frontend_with_jwt(token: str, user: Dict[str, Any]) -> Any:
        """Redirige al frontend alojado en el mismo origen con JWT en query param."""
        import urllib.parse
        base = _frontend_base()
        qs = urllib.parse.urlencode({
            "auth_token": token,
            "auth_user": user.get("name", ""),
            "auth_provider": user.get("provider", ""),
        })
        # Redirigimos al root; el frontend lee query y persiste en localStorage.
        return redirect(f"{base}/login?{qs}")

    @staticmethod
    def _redirect_frontend_with_error(err: str) -> Any:
        import urllib.parse
        base = _frontend_base()
        qs = urllib.parse.urlencode({"auth_error": err})
        return redirect(f"{base}/login?{qs}")


__all__ = ["AuthController"]
