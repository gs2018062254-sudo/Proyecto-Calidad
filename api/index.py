# -*- coding: utf-8 -*-
"""
Servidor SAST Web (Flask).
Compatible con:
  - Modo local:       `py server.py`  (puerto 5001)
  - Vercel serverless: `/api/index.py` handler
"""

from __future__ import annotations

import io
import os
import sys
import zipfile
import tempfile
import json
import time
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask, request, jsonify
from flask_cors import CORS

from sast.rules.engine import AnalyzerEngine, AnalyzerConfig
from sast.models.finding import ScanResult, Severity, Finding
from sast.reports.json_report import JsonReporter
from sast.reports.html_report import HtmlReporter

MAX_TOTAL_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTS = {".py", ".pyw", ".zip"}

app = Flask(__name__)
CORS(app, supports_credentials=False, origins="*")
app.config["MAX_CONTENT_LENGTH"] = MAX_TOTAL_SIZE + 1024

_engine: AnalyzerEngine | None = None


def get_engine(config: AnalyzerConfig | None = None) -> AnalyzerEngine:
    global _engine
    if _engine is None or config is not None:
        _engine = AnalyzerEngine(config=config or AnalyzerConfig())
    elif config is not None:
        _engine.config = config
    return _engine


def _sev_order(sev: str) -> int:
    return {
        "critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4,
    }.get(sev, 99)


def _filter_by_severity(findings: list[Finding], min_sev: str | None) -> list[Finding]:
    if not min_sev or min_sev == "all":
        return findings
    threshold = _sev_order(min_sev)
    return [f for f in findings if _sev_order(f.severity.value) <= threshold]


def _extract_zip_bytes(zip_bytes: bytes, tmpdir: str) -> list[str]:
    extracted: list[str] = []
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile:
        return extracted
    for info in zf.infolist():
        if info.is_dir():
            continue
        name = info.filename.replace("\\", "/")
        if any(seg in {".git", "__pycache__", "node_modules", "venv", ".venv"} for seg in name.split("/")):
            continue
        if not name.lower().endswith((".py", ".pyw")):
            continue
        target = os.path.join(tmpdir, info.filename)
        os.makedirs(os.path.dirname(target) or tmpdir, exist_ok=True)
        try:
            data = zf.read(info)
            if len(data) > 1024 * 1024:
                continue
            with open(target, "wb") as fh:
                fh.write(data)
            extracted.append(target)
        except Exception:
            continue
    zf.close()
    return extracted


def _to_dict_findings(result: ScanResult, sources: dict[str, str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for f in sorted(result.findings):
        d = f.to_dict()
        src = sources.get(f.file_path)
        if src and not d.get("evidence"):
            lines = src.splitlines()
            if 1 <= f.line <= len(lines):
                d["evidence"] = lines[f.line - 1].rstrip()
        out.append(d)
    return out


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "sast_version": "0.1.0", "engine": "ready"})


@app.route("/api/rules", methods=["GET"])
def rules_list():
    engine = get_engine()
    return jsonify({"ok": True, "rules": engine.list_rules()})


@app.route("/api/scan", methods=["POST"])
def scan():
    t0 = time.perf_counter()
    try:
        min_confidence = float(request.form.get("min_confidence", request.args.get("min_confidence", 0.0)) or 0.0)
    except ValueError:
        min_confidence = 0.0
    min_severity = request.form.get("min_severity", request.args.get("min_severity")) or None
    exclude_tests = (request.form.get("exclude_tests", request.args.get("exclude_tests", "true")) or "true").lower() not in {"false", "0", "no"}
    include_sarif = (request.form.get("include_sarif", "false")).lower() == "true"
    include_html = (request.form.get("include_html", "false")).lower() == "true"

    config = AnalyzerConfig()
    config.min_confidence = max(0.0, min(1.0, min_confidence))
    config.exclude_tests = exclude_tests

    source_text: str | None = None
    filename: str | None = None
    tmpdir = None
    sources: dict[str, str] = {}
    target_name = ""

    try:
        if request.content_type and "multipart/form-data" in request.content_type:
            files = request.files.getlist("files")
            if files:
                tmpdir = tempfile.mkdtemp(prefix="sast_upload_")
                for f in files:
                    name = (f.filename or "").replace("\\", "/").split("/")[-1]
                    ext = os.path.splitext(name)[1].lower()
                    if ext not in ALLOWED_EXTS:
                        continue
                    data = f.read()
                    if len(data) > MAX_TOTAL_SIZE:
                        continue
                    if ext == ".zip":
                        _extract_zip_bytes(data, tmpdir)
                    else:
                        if ext in {".py", ".pyw"}:
                            target = os.path.join(tmpdir, name)
                            try:
                                decoded = data.decode("utf-8", errors="replace")
                            except Exception:
                                decoded = data.decode("latin-1", errors="replace")
                            with open(target, "w", encoding="utf-8") as fh:
                                fh.write(decoded)
                            sources[target] = decoded
                target_name = tmpdir
            else:
                source_text = request.form.get("source")
                filename = request.form.get("filename") or "untitled.py"
                target_name = filename
        else:
            try:
                payload = request.get_json(force=True, silent=True) or {}
            except Exception:
                payload = {}
            source_text = payload.get("source")
            filename = payload.get("filename") or "untitled.py"
            min_confidence = float(payload.get("min_confidence", 0.0) or 0.0)
            config.min_confidence = min_confidence
            min_severity = payload.get("min_severity")
            config.exclude_tests = bool(payload.get("exclude_tests", True))
            include_sarif = bool(payload.get("include_sarif", False))
            include_html = bool(payload.get("include_html", False))
            target_name = filename

        engine = get_engine(config)
        result: ScanResult | None = None

        if source_text is not None:
            findings = engine.scan_source(source_text, filename or "untitled.py")
            from datetime import datetime
            result = ScanResult(target=target_name, files_scanned=1, findings=findings)
            result.end_time = datetime.utcnow().isoformat()
            sources[filename or "untitled.py"] = source_text
        elif tmpdir:
            for root, _, files in os.walk(tmpdir):
                for fn in files:
                    if fn.lower().endswith((".py", ".pyw")):
                        p = os.path.join(root, fn)
                        try:
                            with open(p, "r", encoding="utf-8", errors="replace") as fh:
                                sources[p] = fh.read()
                        except Exception:
                            pass
            result = engine.scan(tmpdir)

        if result is None:
            return jsonify({"ok": False, "error": "No se detectó código fuente válido para analizar."}), 400

        result.findings = _filter_by_severity(result.findings, min_severity)
        summary = result.summary
        duration_ms = int((time.perf_counter() - t0) * 1000)
        findings_data = _to_dict_findings(result, sources)

        rel_sources: dict[str, str] = {}
        for p, src in sources.items():
            if tmpdir and p.startswith(tmpdir):
                rel = os.path.relpath(p, tmpdir).replace("\\", "/")
                rel_sources[rel] = src
            else:
                rel_sources[os.path.basename(p)] = src

        for f in findings_data:
            fp = f.get("file_path", "")
            if tmpdir and fp.startswith(tmpdir):
                f["file_path"] = os.path.relpath(fp, tmpdir).replace("\\", "/")

        response: dict[str, Any] = {
            "ok": True,
            "target": target_name,
            "files_scanned": result.files_scanned,
            "duration_ms": duration_ms,
            "sast_version": result.sast_version,
            "summary": summary,
            "findings": findings_data,
            "sources": rel_sources,
            "errors": result.errors[:20],
        }

        if include_sarif:
            try:
                response["sarif"] = JsonReporter().to_sarif(result)
            except Exception:
                pass
        if include_html:
            try:
                response["html_report"] = HtmlReporter().generate(result)
            except Exception:
                pass

        return jsonify(response)

    except Exception as exc:
        return jsonify({"ok": False, "error": f"Error interno: {type(exc).__name__}: {exc}"}), 500
    finally:
        if tmpdir:
            import shutil
            try:
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Vercel Python runtime handler (WSGI bridge)."""
    from werkzeug.wrappers import Request
    from werkzeug.middleware.proxy_fix import ProxyFix
    app_wsgi = ProxyFix(app)
    req = Request(event)
    resp = req.get_response(app_wsgi)
    body = resp.get_data()
    if isinstance(body, bytes):
        body = body.decode("utf-8", errors="replace")
    return {
        "statusCode": resp.status_code,
        "headers": dict(resp.headers),
        "body": body,
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🛡️  SAST Web API corriendo en http://localhost:{port}/api/")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
