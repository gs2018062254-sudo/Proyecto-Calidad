# -*- coding: utf-8 -*-
"""Pruebas automatizadas de verificación de endpoints para la arquitectura MVC.

Incluye autenticación JWT: todos los tests protegen sus requests con un
Bearer Token generado desde una cuenta demo (ADMIN).
"""

from __future__ import annotations

import io
import json
import zipfile
import os
import pytest
from api.index import app
from api.services.auth_service import AUTH_DEMO_USERS, generate_jwt


# ==========================================================================
# Helpers de autenticación JWT para tests
# ==========================================================================

DEMO_ADMIN = AUTH_DEMO_USERS[0]  # admin@calidad.tech
DEMO_USER = AUTH_DEMO_USERS[1]   # demo@calidad.tech


def valid_token(user=DEMO_ADMIN, expires_hours=24) -> str:
    """Genera un JWT válido firmado con JWT_SECRET del entorno/testing."""
    os.environ.setdefault("JWT_SECRET", "sast-test-secret-key-for-jwt-123456")
    return generate_jwt(user, expires_hours=expires_hours)


def auth_headers(token: str | None = None) -> dict:
    """Dict headers con Authorization Bearer."""
    return {"Authorization": f"Bearer {token or valid_token()}"}


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def authed_client(client):
    """Cliente de tests que inyecta Bearer Token en TODOS los requests."""
    token = valid_token()

    class _AuthedClient:
        def __init__(self, inner, token_):
            self.inner = inner
            self.token = token_

        def _merge_headers(self, kwargs):
            hdrs = dict(kwargs.pop("headers", None) or {})
            if "Authorization" not in hdrs:
                hdrs["Authorization"] = f"Bearer {self.token}"
            kwargs["headers"] = hdrs
            return kwargs

        def get(self, *a, **kw): return self.inner.get(*a, **self._merge_headers(kw))
        def post(self, *a, **kw): return self.inner.post(*a, **self._merge_headers(kw))
        def put(self, *a, **kw): return self.inner.put(*a, **self._merge_headers(kw))
        def delete(self, *a, **kw): return self.inner.delete(*a, **self._merge_headers(kw))
        def patch(self, *a, **kw): return self.inner.patch(*a, **self._merge_headers(kw))

    return _AuthedClient(client, token)


# ==========================================================================
# Tests de autenticación (nuevos)
# ==========================================================================

def test_protected_endpoint_returns_401_without_token(client):
    """Cualquier endpoint protegido sin Authorization retorna 401."""
    res = client.get("/api/rules")
    assert res.status_code == 401
    d = res.get_json()
    assert d["ok"] is False
    assert "autenticación" in d["error"] or "autenticacion" in d["error"] or "requiere" in d["error"]


def test_protected_endpoint_with_invalid_token_returns_401(client):
    res = client.get("/api/rules", headers={"Authorization": "Bearer token.muy.invalido"})
    assert res.status_code == 401
    d = res.get_json()
    assert d["ok"] is False


def test_health_endpoint_is_public_no_auth_required(client):
    """Health debe ser público."""
    res = client.get("/api/health")
    assert res.status_code == 200


def test_auth_demo_login_success(client):
    payload = {"email": DEMO_ADMIN["email"], "password": "Admin123!"}
    res = client.post("/api/auth/demo-login", json=payload)
    assert res.status_code == 200
    d = res.get_json()
    assert d["ok"] is True
    assert "token" in d and len(d["token"]) > 50
    assert d["user"]["email"] == DEMO_ADMIN["email"]
    assert d["user"]["name"] == DEMO_ADMIN["name"]
    assert d["auth_type"] == "demo"


def test_auth_demo_login_invalid_password(client):
    payload = {"email": DEMO_ADMIN["email"], "password": "wrongpass"}
    res = client.post("/api/auth/demo-login", json=payload)
    assert res.status_code == 401
    d = res.get_json()
    assert d["ok"] is False
    assert "inválidas" in d["error"] or "invalida" in d["error"]


def test_auth_demo_login_missing_fields(client):
    res = client.post("/api/auth/demo-login", json={"email": "a@a.com"})
    assert res.status_code == 400
    assert res.get_json()["ok"] is False


def test_auth_me_endpoint_returns_user(authed_client):
    res = authed_client.get("/api/auth/me")
    assert res.status_code == 200
    d = res.get_json()
    assert d["ok"] is True
    assert d["user"]["email"] == DEMO_ADMIN["email"]
    assert d["user"]["name"] == DEMO_ADMIN["name"]
    assert d["user"]["provider"] == "demo"


def test_auth_logout_endpoint(client):
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.get_json()["ok"] is True


# ==========================================================================
# Tests originales (adaptados con authed_client)
# ==========================================================================

def test_health_endpoint(authed_client):
    """Verifica el endpoint GET /api/health (es público pero igual funciona con auth)."""
    res = authed_client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["sast_version"] == "0.1.0"
    assert data["engine"] == "ready"

    res2 = authed_client.get("/health")
    assert res2.status_code == 200
    assert res2.get_json() == data


def test_rules_endpoint(authed_client):
    """Verifica el endpoint GET /api/rules (requiere auth)."""
    res = authed_client.get("/api/rules")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "rules" in data
    assert len(data["rules"]) == 12

    first_rule = data["rules"][0]
    assert "id" in first_rule
    assert "title" in first_rule
    assert "severity" in first_rule
    assert "fix_snippet" in first_rule


def test_scan_json_valid_code(authed_client):
    payload = {
        "source": "import os\nuser_input = input()\nos.system('echo ' + user_input)\n",
        "filename": "vuln_sample.py",
        "min_confidence": 0.0,
    }
    res = authed_client.post("/api/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["target"] == "vuln_sample.py"
    assert data["files_scanned"] == 1
    assert "findings" in data
    assert len(data["findings"]) > 0
    assert "summary" in data
    assert "vuln_sample.py" in data["sources"]


def test_scan_json_empty_error(authed_client):
    """Verifica que un payload vacío retorne HTTP 400 con el mensaje exacto."""
    res = authed_client.post("/api/scan", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["ok"] is False
    assert data["error"] == "No se detectó código fuente válido para analizar."


def test_scan_multipart_py_file(authed_client):
    code = b"import sqlite3\nconn = sqlite3.connect(':memory:')\nconn.execute('SELECT * FROM users WHERE id = ' + user_input)\n"
    data = {
        "files": (io.BytesIO(code), "sqli.py"),
        "min_confidence": "0.0",
    }
    res = authed_client.post("/api/scan", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    resp_json = res.get_json()
    assert resp_json["ok"] is True
    assert resp_json["files_scanned"] == 1
    assert len(resp_json["findings"]) > 0


def test_scan_multipart_zip_file(authed_client):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("app/sample_vuln.py", "eval(input('eval: '))\n")
    zip_buffer.seek(0)

    data = {
        "files": (zip_buffer, "project.zip"),
    }
    res = authed_client.post("/api/scan", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    resp_json = res.get_json()
    assert resp_json["ok"] is True
    assert resp_json["files_scanned"] == 1
    assert len(resp_json["findings"]) > 0


def test_scan_severity_filter(authed_client):
    code = """
import os
import hashlib
h = hashlib.md5(b'test').hexdigest()
os.system(input('cmd: '))
"""
    payload = {
        "source": code,
        "filename": "filter_test.py",
        "min_severity": "critical",
    }
    res = authed_client.post("/api/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    for f in data["findings"]:
        assert f["severity"] == "critical"


def test_scan_sarif_and_html_generation(authed_client):
    payload = {
        "source": "eval(input('code: '))",
        "filename": "reports_test.py",
        "include_sarif": True,
        "include_html": True,
    }
    res = authed_client.post("/api/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "sarif" in data
    assert isinstance(data["sarif"], dict)
    assert "html_report" in data
    assert "<!DOCTYPE html>" in data["html_report"]


def test_server_runner_import():
    """Verifica que el entrypoint server.py mantenga compatibilidad con app."""
    from server import app as server_app
    assert server_app is not None
    assert server_app.name == "api.app"
