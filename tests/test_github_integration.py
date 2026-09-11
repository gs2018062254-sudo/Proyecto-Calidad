# -*- coding: utf-8 -*-
"""Pruebas unitarias para la seguridad de GitHub, escaneo multilingüe y protección Zip Slip."""

import io
import tempfile
import zipfile
from unittest.mock import MagicMock, patch
import pytest

from api.app import create_app
from api.services.file_service import FileService


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_github_user_endpoint_disabled_by_security(client):
    """Verifica que /api/github/user responda 403 por política de seguridad contra robo de tokens."""
    res = client.get("/api/github/user")
    assert res.status_code == 403
    data = res.get_json()
    assert data["ok"] is False
    assert "desactivada por políticas de seguridad" in data["error"]


def test_github_repos_endpoint_disabled_by_security(client):
    """Verifica que /api/github/repos responda 403 por política de seguridad."""
    res = client.get("/api/github/repos")
    assert res.status_code == 403
    data = res.get_json()
    assert data["ok"] is False
    assert "desactivada por políticas de seguridad" in data["error"]


def test_github_scan_missing_repo_param(client):
    """Verifica que /api/github/scan falle si falta el parámetro repo."""
    res = client.post("/api/github/scan", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["ok"] is False


@patch("requests.get")
def test_github_scan_success_flow_python(mock_get, client):
    """Verifica el flujo completo de descarga de zipball y escaneo de repositorio Python."""
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

    res = client.post(
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
def test_github_scan_success_flow_typescript_multilang(mock_get, client):
    """Verifica el escaneo exitoso de un proyecto TypeScript / JavaScript (multilingüe)."""
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

    res = client.post(
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
