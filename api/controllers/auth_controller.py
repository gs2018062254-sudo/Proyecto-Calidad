# -*- coding: utf-8 -*-
"""Controlador de autenticación (OAuth Google + Demo + JWT Session).

Endpoints:
  GET  /api/auth/login            -> Redirige a Google OAuth (Sign-In rápido)
  GET  /api/auth/callback         -> Callback Google, emite JWT y redirect a frontend
  POST /api/auth/demo-login       -> Cuentas demo (email + password), retorna JWT
  GET  /api/auth/me               -> Datos del usuario actual (requiere auth)
  POST /api/auth/logout           -> 200 OK (frontend borra el token)
"""

from __future__ import annotations

from typing import Any, Dict

from flask import g, jsonify, redirect, request, session, url_for

from ..controllers.base_controller import BaseController
from ..middleware import requires_auth
from ..services.auth_service import (
    exchange_google_code,
    find_demo_user_by_email,
    generate_jwt,
    generate_oauth_state,
    get_google_oauth_url,
    get_oauth_credentials,
    get_oauth_redirect_uri,
    user_to_public,
    verify_demo_password,
)


def _frontend_base() -> str:
    """Detecta base URL del frontend. Local: reemplaza :5001 por :5173."""
    host = request.host or "localhost:5173"
    scheme = request.scheme
    if "localhost" in host or "127.0.0.1" in host:
        if ":5001" in host:
            host = host.replace(":5001", ":5173", 1)
    return f"{scheme}://{host}"


class AuthController(BaseController):
    """Controlador con endpoints de autenticación (públicos excepto /me)."""

    # ------------------------------------------------------------------
    # GET /api/auth/login — Redirect a Google Sign-In
    # ------------------------------------------------------------------
    @staticmethod
    def google_login() -> Any:
        client_id, _ = get_oauth_credentials()
        if not client_id:
            return BaseController.error(
                "OAuth Google deshabilitado. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.",
                status=501,
            )
        state = generate_oauth_state()
        try:
            session["oauth_state"] = state
        except Exception:
            pass

        request_host = request.host
        redirect_uri = get_oauth_redirect_uri(request_host)
        oauth_url = get_google_oauth_url(state, redirect_uri)
        if not oauth_url:
            return BaseController.error(
                "No se pudo construir URL de autorización Google.",
                status=500,
            )
        return redirect(oauth_url)

    # ------------------------------------------------------------------
    # GET /api/auth/callback — Google OAuth callback
    # ------------------------------------------------------------------
    @staticmethod
    def google_callback() -> Any:
        code = request.args.get("code")
        state = request.args.get("state")
        error = request.args.get("error")

        if error:
            desc = request.args.get("error_description") or f"Google OAuth error: {error}"
            return AuthController._redirect_frontend_with_error(desc)

        if not code:
            return AuthController._redirect_frontend_with_error("No se recibió code de Google.")

        try:
            saved_state = session.pop("oauth_state", None)
            if saved_state and state and saved_state != state:
                return AuthController._redirect_frontend_with_error("State mismatch (posible CSRF).")
        except Exception:
            pass

        redirect_uri = get_oauth_redirect_uri(request.host)
        user, err = exchange_google_code(code, redirect_uri)
        if err or not user:
            return AuthController._redirect_frontend_with_error(err or "No se pudo autenticar con Google.")

        token = generate_jwt(user)
        return AuthController._redirect_frontend_with_jwt(token, user)

    # ------------------------------------------------------------------
    # POST /api/auth/demo-login — Cuentas demo fallback
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
    # POST /api/auth/logout
    # ------------------------------------------------------------------
    @staticmethod
    def logout() -> Any:
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
        import urllib.parse
        base = _frontend_base()
        qs = urllib.parse.urlencode({
            "auth_token": token,
            "auth_user": user.get("name", ""),
            "auth_provider": user.get("provider", ""),
        })
        return redirect(f"{base}/login?{qs}")

    @staticmethod
    def _redirect_frontend_with_error(err: str) -> Any:
        import urllib.parse
        base = _frontend_base()
        qs = urllib.parse.urlencode({"auth_error": err})
        return redirect(f"{base}/login?{qs}")


__all__ = ["AuthController"]
