# -*- coding: utf-8 -*-
"""Controlador MVC para autenticación, navegación y escaneo de repositorios GitHub."""

from __future__ import annotations

import os
import re
import tempfile
import time
from typing import Dict, Tuple
from flask import request, Response

from .base_controller import BaseController
from ..models.scan_request import ScanRequest
from ..services.file_service import FileService
from ..services.github_service import GitHubService
from ..services.scan_service import ScanService
from ..views.scan_view import ScanView


class GitHubController(BaseController):
    """Maneja las solicitudes hacia la API de GitHub y el escaneo de repositorios remotos."""

    @classmethod
    def _extract_token(cls) -> str | None:
        """Extrae el token del header Authorization o del payload."""
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:].strip()
        return request.args.get("token")

    @classmethod
    def get_user(cls) -> Tuple[Response, int]:
        """Informa que el acceso de usuario con token ha sido desactivado por seguridad."""
        return cls.error(
            "La conexión de cuentas de GitHub mediante token personal ha sido desactivada por políticas de seguridad y protección de credenciales.",
            403,
        )

    @classmethod
    def list_repos(cls) -> Tuple[Response, int]:
        """Informa que el listado privado con token ha sido desactivado por seguridad."""
        return cls.error(
            "La consulta de repositorios privados mediante token ha sido desactivada por políticas de seguridad. Utilice el escaneo anónimo por URL o identificador de repositorio público.",
            403,
        )

    @classmethod
    def scan_repo(cls) -> Tuple[Response, int]:
        """Descarga un repositorio público de GitHub y ejecuta el análisis SAST multilingüe seguro."""
        t0 = time.perf_counter()
        tmpdir = None
        sources: Dict[str, str] = {}

        try:
            payload = request.get_json(force=True, silent=True) or {}
            repo_input = str(payload.get("repo") or "").strip()
            branch = str(payload.get("branch") or "").strip() or None

            if not repo_input:
                return cls.error("Debe especificar el repositorio (ej. 'propietario/repositorio' o URL).", 400)

            # Normalizar URL o formato 'owner/repo'
            clean_repo = repo_input.replace("https://github.com/", "").replace("http://github.com/", "")
            if clean_repo.endswith(".git"):
                clean_repo = clean_repo[:-4]
            clean_repo = clean_repo.strip("/")

            parts = clean_repo.split("/")
            if len(parts) < 2 or not parts[0] or not parts[1]:
                return cls.error(
                    f"Formato de repositorio inválido '{repo_input}'. Debe ser 'propietario/nombre' o URL de GitHub.",
                    400,
                )

            owner, repo_name = parts[0], parts[1]

            # Parámetros de escaneo
            try:
                min_confidence = float(payload.get("min_confidence", 0.0) or 0.0)
            except (ValueError, TypeError):
                min_confidence = 0.0

            min_severity = payload.get("min_severity")
            exclude_tests = bool(payload.get("exclude_tests", True))
            include_sarif = bool(payload.get("include_sarif", True))
            include_html = bool(payload.get("include_html", False))

            # Descargar archivo zipball desde GitHub en modo anónimo (sin credenciales)
            zip_bytes = GitHubService.download_repo_zipball(
                owner=owner,
                repo=repo_name,
                ref=branch,
                token=None,
            )

            # Extraer archivos de código en directorio temporal seguro
            tmpdir = tempfile.mkdtemp(prefix="sast_gh_")
            extracted_files = FileService.extract_zip_bytes(zip_bytes, tmpdir)

            if not extracted_files:
                # Comprobar si hubo archivos en tmpdir
                for root, _, files in os.walk(tmpdir):
                    for fn in files:
                        extracted_files.append(os.path.join(root, fn))

            if not extracted_files:
                return cls.error(
                    f"El repositorio '{owner}/{repo_name}' no contiene archivos de código fuente analizables en la rama '{branch or 'default'}'.",
                    400,
                )

            # Leer contenido de las fuentes para el visor
            for fpath in extracted_files:
                try:
                    with open(fpath, "r", encoding="utf-8", errors="replace") as fh:
                        sources[fpath] = fh.read()
                except Exception:
                    pass

            target_display = f"{owner}/{repo_name}" + (f"@{branch}" if branch else "")

            # Construir ScanRequest
            scan_req = ScanRequest(
                source_text=None,
                filename="github_repo",
                target_name=target_display,
                min_confidence=min_confidence,
                min_severity=min_severity,
                exclude_tests=exclude_tests,
                include_sarif=include_sarif,
                include_html=include_html,
                tmpdir=tmpdir,
                sources=sources,
            )

            # Ejecutar análisis SAST
            result = ScanService.execute_scan(scan_req)
            if result is None:
                return cls.error("No se detectó código analizable en el repositorio.", 400)

            # Renderizar respuesta usando ScanView
            duration_ms = int((time.perf_counter() - t0) * 1000)
            response_data = ScanView.render(result, scan_req, duration_ms)
            return cls.success(response_data, 200)

        except FileNotFoundError as exc:
            return cls.error(str(exc), 404)
        except PermissionError as exc:
            return cls.error(str(exc), 401)
        except ValueError as exc:
            return cls.error(str(exc), 400)
        except Exception as exc:
            return cls.error(f"Error interno durante el escaneo de GitHub: {exc}", 500)

        finally:
            if tmpdir:
                FileService.cleanup_temp_dir(tmpdir)
