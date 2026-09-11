# -*- coding: utf-8 -*-
"""Pruebas unitarias para los endpoints del servicio y controlador de GitHub."""

import io
import zipfile
from unittest.mock import MagicMock, patch
import pytest

from api.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_github_user_unauthorized(client):
    """Verifica que /api/github/user retorne 401 si no se envía token."""
    res = client.get("/api/github/user")
    assert res.status_code == 401
    data = res.get_json()
    assert data["ok"] is False


@patch("requests.get")
def test_github_user_valid_token(mock_get, client):
    """Verifica la respuesta de /api/github/user con token mockeado."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": 12345,
        "login": "octocat",
        "name": "The Octocat",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345",
        "html_url": "https://github.com/octocat",
        "public_repos": 8,
    }
    mock_get.return_value = mock_resp

    res = client.get("/api/github/user", headers={"Authorization": "Bearer ghp_test_token"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["user"]["login"] == "octocat"


@patch("requests.get")
def test_github_repos_list(mock_get, client):
    """Verifica listado de repositorios con token o username."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "id": 101,
            "name": "flask-api",
            "full_name": "octocat/flask-api",
            "private": False,
            "html_url": "https://github.com/octocat/flask-api",
            "description": "API backend",
            "language": "Python",
            "default_branch": "main",
            "stargazers_count": 42,
            "updated_at": "2026-09-10T12:00:00Z",
        }
    ]
    mock_get.return_value = mock_resp

    res = client.get("/api/github/repos?username=octocat")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert len(data["repos"]) == 1
    assert data["repos"][0]["name"] == "flask-api"


def test_github_scan_missing_repo_param(client):
    """Verifica que /api/github/scan falle si falta el parámetro repo."""
    res = client.post("/api/github/scan", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["ok"] is False


@patch("requests.get")
def test_github_scan_success_flow(mock_get, client):
    """Verifica el flujo completo de descarga de zipball y escaneo SAST."""
    # Crear un archivo ZIP en memoria con un script vulnerable
    vuln_code = (
        "import os\n"
        "cmd = input('cmd: ')\n"
        "os.system('cat ' + cmd)\n"
    )

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("myrepo-main/app.py", vuln_code)

    zip_bytes = zip_buffer.getvalue()

    # Mockear la respuesta de requests.get para la descarga del zipball
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
