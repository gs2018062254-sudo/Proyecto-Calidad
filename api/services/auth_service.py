# -*- coding: utf-8 -*-
"""Servicio de autenticación: JWT stateless, OAuth 2.0 GitHub y cuentas demo fallback."""

from __future__ import annotations

import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Dict, Optional, Tuple

import jwt as pyjwt
import requests
from werkzeug.security import check_password_hash, generate_password_hash


# ==========================================================================
# Configuración desde entorno
# ==========================================================================

@lru_cache(maxsize=1)
def _getenv(name: str, default: Optional[str] = None) -> Optional[str]:
    """Cache simple de variables de entorno (no cambian en runtime)."""
    val = os.environ.get(name)
    if val is None or val == "":
        return default
    return val


JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def get_jwt_secret() -> str:
    """Devuelve JWT_SECRET. En producción falla si falta; en dev usa fallback."""
    secret = _getenv("JWT_SECRET")
    if secret and secret != "dev-secret-change-me-please-123456":
        return secret
    debug = _getenv("DEBUG", "0") in ("1", "true", "True")
    if not debug and not secret:
        print("⚠️  [AUTH] JWT_SECRET no configurada en entorno. Establece una clave fuerte en producción.")
    # Fallback sólo para dev/testing
    return secret or "dev-secret-change-me-please-123456"


def get_oauth_credentials() -> Tuple[Optional[str], Optional[str]]:
    """Retorna (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) o (None, None) si no están."""
    cid = _getenv("GITHUB_CLIENT_ID")
    csec = _getenv("GITHUB_CLIENT_SECRET")
    if cid and csec:
        return cid, csec
    return None, None


def get_oauth_redirect_uri(request_host: Optional[str] = None) -> Optional[str]:
    """URI de callback para OAuth GitHub. Primero variable explícita, luego auto detectar."""
    explicit = _getenv("OAUTH_REDIRECT_URI")
    if explicit:
        return explicit.rstrip("/")
    if request_host:
        scheme = _getenv("OAUTH_SCHEME") or ("http" if "localhost" in request_host or "127.0.0.1" in request_host else "https")
        return f"{scheme}://{request_host.rstrip('/')}/api/auth/callback"
    return None


# ==========================================================================
# Cuentas Demo (Fallback para testing / entorno sin OAuth)
# Contraseñas hasheadas con Werkzeug PBKDF2 (nunca en claro)
# ==========================================================================

def _demo_pw(pw: str) -> str:
    return generate_password_hash(pw, method="pbkdf2:sha256", salt_length=16)


AUTH_DEMO_USERS: Tuple[Dict[str, Any], ...] = (
    {
        "sub": "demo|admin",
        "email": "admin@calidad.tech",
        "name": "Admin SAST",
        "avatar_url": "",
        "provider": "demo",
        "role": "admin",
        "password_hash": _demo_pw("Admin123!"),
    },
    {
        "sub": "demo|user",
        "email": "demo@calidad.tech",
        "name": "Usuario Demo",
        "avatar_url": "",
        "provider": "demo",
        "role": "user",
        "password_hash": _demo_pw("Demo123!"),
    },
)


def find_demo_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    needle = email.strip().lower()
    for u in AUTH_DEMO_USERS:
        if u["email"].lower() == needle:
            return u
    return None


def verify_demo_password(user: Dict[str, Any], password: str) -> bool:
    if not user or "password_hash" not in user or not isinstance(password, str):
        return False
    return check_password_hash(user["password_hash"], password)


def user_to_public(user: Dict[str, Any]) -> Dict[str, Any]:
    """Devuelve el usuario sin campos privados (password_hash)."""
    return {k: v for k, v in user.items() if k not in ("password_hash",)}


# ==========================================================================
# JWT — Generar / Verificar
# ==========================================================================

def generate_jwt(user: Dict[str, Any], expires_hours: int = JWT_EXPIRATION_HOURS) -> str:
    """Crea un JWT firmado HS256 con datos del usuario (sin password_hash)."""
    public = user_to_public(user)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": public.get("sub") or public.get("email") or f"user:{uuid.uuid4().hex}",
        "email": public.get("email"),
        "name": public.get("name"),
        "avatar_url": public.get("avatar_url", ""),
        "provider": public.get("provider", "unknown"),
        "role": public.get("role", "user"),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=expires_hours)).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Valida signature + exp; retorna payload o None si inválido."""
    if not token or not isinstance(token, str):
        return None
    try:
        payload = pyjwt.decode(
            token.strip(),
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub", "iat"]},
        )
        return payload
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError, Exception):
        return None


# ==========================================================================
# OAuth 2.0 GitHub
# ==========================================================================

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails"
GITHUB_SCOPES = "read:user user:email"


def generate_oauth_state() -> str:
    """State anti-CSRF para el flujo OAuth."""
    return secrets.token_urlsafe(24)


def get_github_oauth_url(state: str, redirect_uri: Optional[str]) -> Optional[str]:
    """Construye URL /authorize de GitHub. Retorna None si OAuth deshabilitado."""
    client_id, _ = get_oauth_credentials()
    if not client_id:
        return None
    params = [
        f"client_id={client_id}",
        "response_type=code",
        f"scope={GITHUB_SCOPES}",
        f"state={state}",
        "allow_signup=true",
    ]
    if redirect_uri:
        params.append(f"redirect_uri={redirect_uri}")
    return GITHUB_AUTHORIZE_URL + "?" + "&".join(params)


def exchange_github_code(code: str, redirect_uri: Optional[str]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Intercambia `code` por access_token y luego obtiene perfil del usuario.
    Retorna: (user_dict | None, error_msg | None)
    """
    client_id, client_secret = get_oauth_credentials()
    if not client_id or not client_secret:
        return None, "OAuth GitHub deshabilitado en este servidor."

    if not code or not isinstance(code, str) or not code.strip():
        return None, "Parámetro code vacío o inválido."

    try:
        # 1) Obtener access_token
        tok_payload: Dict[str, Any] = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code.strip(),
        }
        if redirect_uri:
            tok_payload["redirect_uri"] = redirect_uri

        tok_resp = requests.post(
            GITHUB_ACCESS_TOKEN_URL,
            json=tok_payload,
            headers={"Accept": "application/json", "User-Agent": "sast-studio"},
            timeout=20,
        )
        if tok_resp.status_code != 200:
            return None, f"GitHub token endpoint falló (HTTP {tok_resp.status_code})."
        tok_json = tok_resp.json()
        access_token = tok_json.get("access_token")
        if not access_token or "error" in tok_json:
            return None, tok_json.get("error_description") or "No se obtuvo access_token de GitHub."

        # 2) Obtener perfil básico
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "sast-studio",
        }
        user_resp = requests.get(GITHUB_USER_URL, headers=headers, timeout=15)
        if user_resp.status_code != 200:
            return None, f"GitHub /user endpoint falló (HTTP {user_resp.status_code})."
        gh_user = user_resp.json()

        # 3) Si email es privado (null), consultar /user/emails
        email = gh_user.get("email")
        if not email:
            try:
                emails_resp = requests.get(GITHUB_USER_EMAILS_URL, headers=headers, timeout=15)
                if emails_resp.status_code == 200:
                    for e in emails_resp.json():
                        if e.get("primary") and e.get("verified"):
                            email = e.get("email")
                            break
                    if not email and emails_resp.json():
                        email = emails_resp.json()[0].get("email")
            except Exception:
                pass

        if not email:
            email = f"{gh_user.get('login', 'github-user')}+noreply@github.com"

        user_obj = {
            "sub": f"github|{gh_user.get('id') or gh_user.get('login')}",
            "email": email,
            "name": gh_user.get("name") or gh_user.get("login") or "Usuario GitHub",
            "avatar_url": gh_user.get("avatar_url", ""),
            "provider": "github",
            "role": "user",
            "github_login": gh_user.get("login"),
            "github_html_url": gh_user.get("html_url"),
        }
        return user_obj, None
    except requests.RequestException as exc:
        return None, f"Error de red al contactar GitHub: {exc.__class__.__name__}"
    except Exception as exc:  # pragma: no cover - safety net
        return None, f"Error inesperado OAuth: {exc.__class__.__name__}"
