# -*- coding: utf-8 -*-
"""Pruebas unitarias para las capas MVC (Models, Views, Controllers, Services)."""

import os
import io
import zipfile
import pytest

from api.app import create_app
from api.models.scan_request import ScanRequest
from api.services.file_service import FileService
from api.services.rules_service import RulesService
from api.services.scan_service import ScanService
from api.views.health_view import HealthView
from api.views.rules_view import RulesView
from api.views.scan_view import ScanView
from api.controllers.base_controller import BaseController
from api.controllers.health_controller import HealthController
from api.controllers.rules_controller import RulesController
from sast.models.finding import Finding, Severity, ScanResult


@pytest.fixture
def app_ctx():
    app = create_app()
    with app.app_context():
        yield app


def test_base_controller(app_ctx):
    """Verifica que BaseController formatee respuestas exitosas y de error."""
    resp, code = BaseController.success({"test": True}, 200)
    assert code == 200
    assert resp.get_json() == {"test": True}

    err_resp, err_code = BaseController.error("Falló la validación", 400)
    assert err_code == 400
    assert err_resp.get_json() == {"ok": False, "error": "Falló la validación"}


def test_health_mvc_flow(app_ctx):
    """Verifica el flujo desacoplado de HealthView y HealthController."""
    rendered = HealthView.render(sast_version="0.1.0")
    assert rendered == {"ok": True, "sast_version": "0.1.0", "engine": "ready"}

    resp, code = HealthController.check_health()
    assert code == 200
    assert resp.get_json()["ok"] is True


def test_rules_mvc_flow(app_ctx):
    """Verifica el flujo de RulesService, RulesView y RulesController."""
    rules = RulesService.list_rules()
    assert isinstance(rules, list)
    assert len(rules) == 8

    rendered = RulesView.render(rules)
    assert rendered["ok"] is True
    assert rendered["rules"] == rules

    resp, code = RulesController.list_rules()
    assert code == 200
    assert resp.get_json()["ok"] is True


def test_file_service_zip_extraction(tmp_path):
    """Verifica la extracción segura y exclusión de directorios en FileService."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("clean.py", "print('clean')")
        zf.writestr("node_modules/bad.py", "print('bad')")
        zf.writestr("notes.txt", "texto ignorado")
    zip_buf.seek(0)

    extracted = FileService.extract_zip_bytes(zip_buf.getvalue(), str(tmp_path))
    assert len(extracted) == 1
    assert extracted[0].endswith("clean.py")
    assert os.path.exists(extracted[0])

    # Probar cleanup seguro
    FileService.cleanup_temp_dir(str(tmp_path))


def test_scan_service_severity_filtering():
    """Verifica la lógica de orden y filtrado de severidades en ScanService."""
    assert ScanService.sev_order("critical") == 0
    assert ScanService.sev_order("high") == 1
    assert ScanService.sev_order("medium") == 2
    assert ScanService.sev_order("low") == 3
    assert ScanService.sev_order("info") == 4
    assert ScanService.sev_order("unknown") == 99

    f1 = Finding(rule_id="R1", title="Crit", severity=Severity.CRITICAL, file_path="a.py", line=1)
    f2 = Finding(rule_id="R2", title="High", severity=Severity.HIGH, file_path="a.py", line=2)
    f3 = Finding(rule_id="R3", title="Low", severity=Severity.LOW, file_path="a.py", line=3)

    findings = [f1, f2, f3]

    # Filtrar solo 'high' o mayor (critical + high)
    filtered = ScanService.filter_by_severity(findings, "high")
    assert len(filtered) == 2
    assert {f.title for f in filtered} == {"Crit", "High"}

    # Filtrar 'all'
    assert len(ScanService.filter_by_severity(findings, "all")) == 3
    assert len(ScanService.filter_by_severity(findings, None)) == 3


def test_scan_view_rendering():
    """Verifica la serialización exacta de ScanView."""
    res = ScanResult(target="example.py", files_scanned=1)
    f = Finding(
        rule_id="SEC001",
        title="Hardcoded Secret",
        severity=Severity.HIGH,
        file_path="example.py",
        line=1,
    )
    res.findings.append(f)

    req = ScanRequest(
        source_text="SECRET = '12345'",
        filename="example.py",
        target_name="example.py",
        sources={"example.py": "SECRET = '12345'"},
    )

    rendered = ScanView.render(res, req, duration_ms=12)
    assert rendered["ok"] is True
    assert rendered["target"] == "example.py"
    assert rendered["duration_ms"] == 12
    assert len(rendered["findings"]) == 1
    assert rendered["findings"][0]["evidence"] == "SECRET = '12345'"
    assert rendered["sources"]["example.py"] == "SECRET = '12345'"
