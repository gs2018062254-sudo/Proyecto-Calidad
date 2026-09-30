# -*- coding: utf-8 -*-
"""Pruebas unitarias para la seguridad de GitHub, escaneo multilingüe y protección Zip Slip.

Incluye fixture de autenticación JWT (todos los endpoints /api/github/* protegidos).
"""

import io
import os
import tempfile
import zipfile
from unittest.mock import MagicMock, patch
import pytest

from api.app import create_app
from api.services.file_service import FileService
from api.services.auth_service import AUTH_DEMO_USERS, generate_jwt


DEMO_ADMIN = AUTH_DEMO_USERS[0]


def _valid_token():
    os.environ.setdefault("JWT_SECRET", "sast-test-secret-key-for-jwt-123456")
    return generate_jwt(DEMO_ADMIN)


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def authed_client(client):
    token = _valid_token()

    class _Wrap:
        def __init__(self, inner, tok):
            self.inner = inner
            self.tok = tok

        def _hdrs(self, kw):
            hdrs = dict(kw.pop("headers", None) or {})
            if "Authorization" not in hdrs:
                hdrs["Authorization"] = f"Bearer {self.tok}"
            kw["headers"] = hdrs
            return kw

        def get(self, *a, **kw): return self.inner.get(*a, **self._hdrs(kw))
        def post(self, *a, **kw): return self.inner.post(*a, **self._hdrs(kw))

    return _Wrap(client, token)


def test_github_endpoints_require_auth_without_token_returns_401(client):
    """Primer control: sin token -> 401 (antes de cualquier política 403)."""
    r1 = client.get("/api/github/user")
    r2 = client.get("/api/github/repos")
    r3 = client.post("/api/github/scan", json={})
    assert r1.status_code == 401
    assert r2.status_code == 401
    assert r3.status_code == 401


def test_github_user_endpoint_disabled_by_security(authed_client):
    """Con JWT válido, pasa auth y luego devuelve 403 por política de seguridad."""
    res = authed_client.get("/api/github/user")
    assert res.status_code == 403
    data = res.get_json()
    assert data["ok"] is False
    assert "desactivada por políticas de seguridad" in data["error"]


def test_github_repos_endpoint_disabled_by_security(authed_client):
    """Con JWT válido -> 403 política de seguridad."""
    res = authed_client.get("/api/github/repos")
    assert res.status_code == 403
    data = res.get_json()
    assert data["ok"] is False
    assert "desactivada por políticas de seguridad" in data["error"]


def test_github_scan_missing_repo_param(authed_client):
    """Con JWT válido, error 400 por falta de repo (no 401/403)."""
    res = authed_client.post("/api/github/scan", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["ok"] is False


@patch("requests.get")
def test_github_scan_success_flow_python(mock_get, authed_client):
    """Verifica el flujo completo de descarga de zipball y escaneo de repositorio Python con JWT."""
    vuln_code = (
        "import os\n"
        "cmd = input('cmd: ')\n"
        "os.system('cat ' + cmd)\n"
    )

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("myrepo-main/app.py", vuln_code)

    zip_bytes = zip_buffer.getvalue()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.iter_content.return_value = [zip_bytes]
    mock_get.return_value = mock_resp

    res = authed_client.post(
        "/api/github/scan",
        json={"repo": "octocat/myrepo", "branch": "main"},
    )

    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["files_scanned"] >= 1
    assert len(data["findings"]) >= 1
    assert any("Command" in f["title"] or f["rule_id"] == "COMMAND_INJECTION" for f in data["findings"])


@patch("requests.get")
def test_github_scan_success_flow_typescript_multilang(mock_get, authed_client):
    """Verifica el escaneo exitoso de un proyecto TypeScript / JavaScript (multilingüe) con JWT."""
    ts_code = (
        "import React from 'react';\n"
        "const API_SECRET = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';\n"
        "export function Component({ rawInput }: { rawInput: string }) {\n"
        "  eval(rawInput);\n"
        "  return <div dangerouslySetInnerHTML={{ __html: rawInput }} />;\n"
        "}\n"
    )

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("skinbridge-main/src/App.tsx", ts_code)

    zip_bytes = zip_buffer.getvalue()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.iter_content.return_value = [zip_bytes]
    mock_get.return_value = mock_resp

    res = authed_client.post(
        "/api/github/scan",
        json={"repo": "NestorSnIbz/skinbridge-creator-tools", "branch": "main"},
    )

    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["files_scanned"] >= 1
    assert len(data["findings"]) >= 1
    rule_ids = {f["rule_id"] for f in data["findings"]}
    assert "HARDCODED_SECRET" in rule_ids or "DANGEROUS_FUNCTION" in rule_ids or "XSS" in rule_ids


def test_zip_slip_protection():
    """Verifica que FileService.extract_zip_bytes neutralice ataques de Zip Slip (path traversal)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            # Archivo legítimo
            zf.writestr("legit.py", "print('legit')\n")
            # Archivo malicioso con path traversal
            zf.writestr("../../evil.py", "print('evil')\n")
            zf.writestr("sub/../../../evil2.ts", "console.log('evil')\n")

        zip_bytes = zip_buffer.getvalue()
        extracted = FileService.extract_zip_bytes(zip_bytes, tmpdir)

        # Solo debe haber extraído el legítimo
        assert len(extracted) == 1
        assert extracted[0].endswith("legit.py")
