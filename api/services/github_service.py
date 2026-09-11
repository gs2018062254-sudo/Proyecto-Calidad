# -*- coding: utf-8 -*-
"""Servicio de integración con la API REST de GitHub."""

from __future__ import annotations

import io
from typing import Any, Dict, List, Optional
import requests

GITHUB_API_BASE = "https://api.github.com"
MAX_REPO_ZIP_SIZE = 25 * 1024 * 1024  # 25 MB max para escaneo remoto


class GitHubService:
    """Maneja la autenticación, consulta de repositorios y descarga de código de GitHub."""

    @classmethod
    def _headers(cls, token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "SAST-Studio-Security-Scanner",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token and token.strip():
            headers["Authorization"] = f"Bearer {token.strip()}"
        return headers

    @classmethod
    def verify_and_get_user(cls, token: str) -> Dict[str, Any]:
        """Verifica un Personal Access Token u OAuth Token y retorna los datos del usuario."""
        if not token or not token.strip():
            raise ValueError("Token de GitHub no proporcionado.")

        url = f"{GITHUB_API_BASE}/user"
        resp = requests.get(url, headers=cls._headers(token), timeout=12)
        if resp.status_code == 401:
            raise PermissionError("Token de GitHub inválido o expirado.")
        if resp.status_code != 200:
            raise RuntimeError(f"Error al consultar usuario en GitHub: HTTP {resp.status_code}")

        data = resp.json()
        return {
            "id": data.get("id"),
            "login": data.get("login"),
            "name": data.get("name") or data.get("login"),
            "avatar_url": data.get("avatar_url"),
            "html_url": data.get("html_url"),
            "public_repos": data.get("public_repos", 0),
            "total_private_repos": data.get("total_private_repos", 0),
        }

    @classmethod
    def list_repositories(
        cls,
        token: Optional[str] = None,
        username: Optional[str] = None,
        page: int = 1,
        per_page: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Lista repositorios accesibles por el usuario.
        Si hay token, consulta /user/repos (incluye privados y organizaciones).
        Si no hay token pero sí username, consulta /users/{username}/repos (públicos).
        """
        if token and token.strip():
            url = f"{GITHUB_API_BASE}/user/repos"
            params = {
                "sort": "updated",
                "direction": "desc",
                "per_page": min(per_page, 100),
                "page": max(1, page),
                "affiliation": "owner,collaborator,organization_member",
            }
        elif username and username.strip():
            url = f"{GITHUB_API_BASE}/users/{username.strip()}/repos"
            params = {
                "sort": "updated",
                "direction": "desc",
                "per_page": min(per_page, 100),
                "page": max(1, page),
            }
        else:
            raise ValueError("Se requiere un token de acceso o un nombre de usuario de GitHub.")

        resp = requests.get(url, headers=cls._headers(token), params=params, timeout=12)
        if resp.status_code == 401:
            raise PermissionError("Acceso no autorizado a GitHub con el token suministrado.")
        if resp.status_code != 200:
            raise RuntimeError(f"Error al obtener repositorios de GitHub: HTTP {resp.status_code}")

        repos_raw = resp.json()
        if not isinstance(repos_raw, list):
            return []

        cleaned: List[Dict[str, Any]] = []
        for r in repos_raw:
            cleaned.append({
                "id": r.get("id"),
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "private": bool(r.get("private")),
                "html_url": r.get("html_url"),
                "description": r.get("description") or "",
                "language": r.get("language") or "Python",
                "default_branch": r.get("default_branch") or "main",
                "stargazers_count": r.get("stargazers_count", 0),
                "forks_count": r.get("forks_count", 0),
                "updated_at": r.get("updated_at"),
            })
        return cleaned

    @classmethod
    def get_repo_details(
        cls,
        owner: str,
        repo: str,
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Obtiene detalles de un repositorio específico (público o privado)."""
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
        resp = requests.get(url, headers=cls._headers(token), timeout=12)
        if resp.status_code == 404:
            raise FileNotFoundError(f"El repositorio {owner}/{repo} no fue encontrado en GitHub.")
        if resp.status_code != 200:
            raise RuntimeError(f"Error al consultar repositorio: HTTP {resp.status_code}")

        r = resp.json()
        return {
            "id": r.get("id"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "private": bool(r.get("private")),
            "html_url": r.get("html_url"),
            "description": r.get("description") or "",
            "language": r.get("language") or "Python",
            "default_branch": r.get("default_branch") or "main",
            "stargazers_count": r.get("stargazers_count", 0),
        }

    @classmethod
    def download_repo_zipball(
        cls,
        owner: str,
        repo: str,
        ref: Optional[str] = None,
        token: Optional[str] = None,
    ) -> bytes:
        """
        Descarga el archivo zipball del repositorio desde GitHub.
        Sigue redirecciones y valida que no exceda el límite de tamaño seguro.
        """
        ref_part = f"/{ref.strip()}" if ref and ref.strip() else ""
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/zipball{ref_part}"

        resp = requests.get(
            url,
            headers=cls._headers(token),
            stream=True,
            timeout=30,
            allow_redirects=True,
        )

        if resp.status_code == 404:
            raise FileNotFoundError(f"Rama o repositorio '{owner}/{repo}' no encontrado.")
        if resp.status_code == 401:
            raise PermissionError("Token no autorizado para descargar este repositorio.")
        if resp.status_code != 200:
            raise RuntimeError(f"Fallo al descargar zipball de GitHub: HTTP {resp.status_code}")

        buffer = io.BytesIO()
        downloaded = 0
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if chunk:
                downloaded += len(chunk)
                if downloaded > MAX_REPO_ZIP_SIZE:
                    raise ValueError(
                        f"El repositorio supera el límite de tamaño permitido para análisis ({MAX_REPO_ZIP_SIZE // (1024*1024)} MB)."
                    )
                buffer.write(chunk)

        return buffer.getvalue()
