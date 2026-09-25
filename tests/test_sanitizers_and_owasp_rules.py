# -*- coding: utf-8 -*-
"""Pruebas unitarias para sanitizadores de flujo de datos (TAINT_SANITIZERS) y nuevas reglas OWASP Top 10."""

from sast.rules.engine import AnalyzerEngine


def test_taint_sanitizer_xss_html_escape():
    """Verifica que html.escape() elimine falsos positivos de XSS cuando sanitiza una variable tainted."""
    engine = AnalyzerEngine()
    safe_code = """
import html
from flask import request, render_template_string

def greet():
    user_input = request.args.get("name")
    safe_name = html.escape(user_input)
    return render_template_string(f"<h1>Hola {safe_name}</h1>")
"""
    findings = engine.scan_source(safe_code, "safe_xss.py")
    xss_findings = [f for f in findings if f.rule_id == "XSS"]
    assert len(xss_findings) == 0


def test_taint_sanitizer_command_shlex_quote():
    """Verifica que shlex.quote() elimine falsos positivos de Command Injection."""
    engine = AnalyzerEngine()
    safe_code = """
import os, shlex
from flask import request

def ping_host():
    raw_host = request.args.get("host")
    safe_host = shlex.quote(raw_host)
    os.system(f"ping -c 1 {safe_host}")
"""
    findings = engine.scan_source(safe_code, "safe_cmd.py")
    cmd_findings = [f for f in findings if f.rule_id == "COMMAND_INJECTION"]
    assert len(cmd_findings) == 0


def test_taint_sanitizer_path_basename():
    """Verifica que os.path.basename() elimine falsos positivos de Path Traversal."""
    engine = AnalyzerEngine()
    safe_code = """
import os
from flask import request

def read_doc():
    filename = request.args.get("file")
    clean_name = os.path.basename(filename)
    with open(clean_name, "r") as f:
        return f.read()
"""
    findings = engine.scan_source(safe_code, "safe_path.py")
    path_findings = [f for f in findings if f.rule_id == "PATH_TRAVERSAL"]
    assert len(path_findings) == 0


def test_taint_sanitizer_universal_int_sql():
    """Verifica que int() actúe como sanitizador universal eliminando falsos positivos de SQLi."""
    engine = AnalyzerEngine()
    safe_code = """
from flask import request

def get_user(cursor):
    raw_id = request.args.get("id")
    user_id = int(raw_id)
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
"""
    findings = engine.scan_source(safe_code, "safe_sql.py")
    sql_findings = [f for f in findings if f.rule_id == "SQL_INJECTION"]
    assert len(sql_findings) == 0


def test_ssrf_rule_detection():
    """Verifica que SSRFRule detecte peticiones HTTP con URLs controladas por el usuario (CWE-918)."""
    engine = AnalyzerEngine()
    vuln_code = """
import requests
from flask import request

def proxy():
    target = request.args.get("url")
    resp = requests.get(target)
    return resp.text
"""
    findings = engine.scan_source(vuln_code, "vuln_ssrf.py")
    ssrf_findings = [f for f in findings if f.rule_id == "SSRF"]
    assert len(ssrf_findings) == 1
    assert ssrf_findings[0].cwe == "CWE-918"
    assert ssrf_findings[0].fix_snippet != ""


def test_insecure_deserialization_rule_vs_safe_load():
    """Verifica que yaml.load sin SafeLoader sea detectado mientras yaml.safe_load no genere alerta."""
    engine = AnalyzerEngine()
    vuln_code = """
import yaml

def parse_bad(raw):
    return yaml.load(raw)
"""
    safe_code = """
import yaml

def parse_good(raw):
    return yaml.safe_load(raw)
"""
    vuln_findings = [f for f in engine.scan_source(vuln_code, "bad_yaml.py") if f.rule_id == "INSECURE_DESERIALIZATION"]
    safe_findings = [f for f in engine.scan_source(safe_code, "good_yaml.py") if f.rule_id == "INSECURE_DESERIALIZATION"]
    assert len(vuln_findings) == 1
    assert vuln_findings[0].cwe == "CWE-502"
    assert len(safe_findings) == 0


def test_security_misconfiguration_rule():
    """Verifica detección de verify=False y debug=True (CWE-295 / CWE-489)."""
    engine = AnalyzerEngine()
    vuln_code = """
import requests
from flask import Flask
app = Flask(__name__)

def fetch_insecure():
    return requests.get("https://internal.local/api", verify=False)

if __name__ == "__main__":
    app.run(debug=True)
"""
    findings = [f for f in engine.scan_source(vuln_code, "misconfig.py") if f.rule_id == "SECURITY_MISCONFIGURATION"]
    assert len(findings) == 2


def test_jwt_weakness_rule():
    """Verifica detección de jwt.decode con verify_signature=False (CWE-347)."""
    engine = AnalyzerEngine()
    vuln_code = """
import jwt

def decode_token(token):
    return jwt.decode(token, options={"verify_signature": False})
"""
    findings = [f for f in engine.scan_source(vuln_code, "jwt_vuln.py") if f.rule_id == "JWT_WEAKNESS"]
    assert len(findings) == 1
    assert findings[0].cwe == "CWE-347"
