# -*- coding: utf-8 -*-
"""Pruebas automatizadas de verificación de endpoints para la arquitectura MVC."""

import io
import json
import zipfile
import pytest
from api.index import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    """Verifica el endpoint GET /api/health."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["sast_version"] == "0.1.0"
    assert data["engine"] == "ready"

    # Verificar ruta sin prefijo /api
    res2 = client.get("/health")
    assert res2.status_code == 200
    assert res2.get_json() == data


def test_rules_endpoint(client):
    """Verifica el endpoint GET /api/rules."""
    res = client.get("/api/rules")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "rules" in data
    assert len(data["rules"]) == 12

    # Verificar estructura de regla
    first_rule = data["rules"][0]
    assert "id" in first_rule
    assert "title" in first_rule
    assert "severity" in first_rule
    assert "fix_snippet" in first_rule


def test_scan_json_valid_code(client):
    """Verifica el escaneo mediante payload JSON con código vulnerable."""
    payload = {
        "source": "import os\nuser_input = input()\nos.system('echo ' + user_input)\n",
        "filename": "vuln_sample.py",
        "min_confidence": 0.0,
    }
    res = client.post("/api/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["target"] == "vuln_sample.py"
    assert data["files_scanned"] == 1
    assert "findings" in data
    assert len(data["findings"]) > 0
    assert "summary" in data
    assert "vuln_sample.py" in data["sources"]


def test_scan_json_empty_error(client):
    """Verifica que un payload vacío retorne HTTP 400 con el mensaje exacto."""
    res = client.post("/api/scan", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["ok"] is False
    assert data["error"] == "No se detectó código fuente válido para analizar."


def test_scan_multipart_py_file(client):
    """Verifica el escaneo mediante carga multipart de un archivo .py."""
    code = b"import sqlite3\nconn = sqlite3.connect(':memory:')\nconn.execute('SELECT * FROM users WHERE id = ' + user_input)\n"
    data = {
        "files": (io.BytesIO(code), "sqli.py"),
        "min_confidence": "0.0",
    }
    res = client.post("/api/scan", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    resp_json = res.get_json()
    assert resp_json["ok"] is True
    assert resp_json["files_scanned"] == 1
    assert len(resp_json["findings"]) > 0


def test_scan_multipart_zip_file(client):
    """Verifica el escaneo mediante carga multipart de un archivo ZIP."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("app/sample_vuln.py", "eval(input('eval: '))\n")
    zip_buffer.seek(0)

    data = {
        "files": (zip_buffer, "project.zip"),
    }
    res = client.post("/api/scan", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    resp_json = res.get_json()
    assert resp_json["ok"] is True
    assert resp_json["files_scanned"] == 1
    assert len(resp_json["findings"]) > 0


def test_scan_severity_filter(client):
    """Verifica el filtrado por severidad en /api/scan."""
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
    res = client.post("/api/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    for f in data["findings"]:
        assert f["severity"] == "critical"


def test_scan_sarif_and_html_generation(client):
    """Verifica la generación de SARIF y HTML cuando se solicitan explícitamente."""
    payload = {
        "source": "eval(input('code: '))",
        "filename": "reports_test.py",
        "include_sarif": True,
        "include_html": True,
    }
    res = client.post("/api/scan", json=payload)
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
