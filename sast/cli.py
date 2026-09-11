from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional, List

try:
    import click
except ImportError:
    print("Error: La dependencia 'click' no está instalada. Ejecuta: pip install click jinja2", file=sys.stderr)
    sys.exit(1)

from . import __version__
from .rules.engine import AnalyzerEngine, AnalyzerConfig
from .models.finding import ScanResult, Severity
from .reports.console import ConsoleReporter
from .reports.json_report import JsonReporter
from .reports.html_report import HtmlReporter


SUPPORTED_FORMATS = {"text", "json", "html", "sarif"}


def _build_config(
    exclude_tests: bool,
    exclude_patterns: List[str],
    min_confidence: float,
) -> AnalyzerConfig:
    config = AnalyzerConfig()
    config.exclude_tests = exclude_tests
    config.min_confidence = min_confidence
    if exclude_patterns:
        config.excluded_patterns.extend(exclude_patterns)
    return config


def _validate_output(ctx, param, value):
    if value:
        suffix = Path(value).suffix.lower()
    return value


@click.group(
    help="🛡️  SAST - Analizador Estático de Vulnerabilidades de Código",
    context_settings={"help_option_names": ["-h", "--help"]},
)
@click.version_option(version=__version__, prog_name="sast", message="%(prog)s v%(version)s")
def main():
    """Comando principal."""
    pass


@main.command("scan", short_help="Escanea archivos o directorios en busca de vulnerabilidades")
@click.argument("target", nargs=1, type=click.Path(exists=True, readable=True))
@click.option(
    "-f", "--format", "fmt",
    type=click.Choice(sorted(SUPPORTED_FORMATS), case_sensitive=False),
    default="text",
    show_default=True,
    help="Formato del reporte de salida.",
)
@click.option(
    "-o", "--output",
    type=click.Path(dir_okay=False, writable=True),
    default=None,
    help="Ruta del archivo de salida (si no se especifica, stdout).",
)
@click.option(
    "-c", "--min-confidence",
    type=click.FloatRange(0.0, 1.0),
    default=0.0,
    show_default=True,
    help="Nivel mínimo de confianza para reportar un hallazgo (0.0 - 1.0).",
)
@click.option(
    "--severity-threshold",
    type=click.Choice(["critical", "high", "medium", "low", "info"], case_sensitive=False),
    default=None,
    help="Devuelve código de salida no-cero si se encuentra al menos una vulnerabilidad con esta severidad o mayor.",
)
@click.option(
    "--include-tests/--no-include-tests",
    default=False,
    show_default=True,
    help="Incluye/excluye archivos de test (tests/, test_*, *_test.py).",
)
@click.option(
    "--exclude",
    "exclude_patterns",
    multiple=True,
    help="Patrón glob adicional a excluir (se puede pasar múltiples veces).",
)
@click.option(
    "-v", "--verbose",
    is_flag=True,
    default=False,
    help="Muestra flujo de datos y recomendaciones detalladas en consola.",
)
@click.option(
    "--no-color",
    is_flag=True,
    default=False,
    help="Desactiva colores en la salida de consola.",
)
def scan(
    target: str,
    fmt: str,
    output: Optional[str],
    min_confidence: float,
    severity_threshold: Optional[str],
    include_tests: bool,
    exclude_patterns: List[str],
    verbose: bool,
    no_color: bool,
):
    """
    Ejecuta el análisis estático de seguridad sobre TARGET
    (un archivo .py o un directorio con código Python).
    """
    config = _build_config(
        exclude_tests=not include_tests,
        exclude_patterns=list(exclude_patterns),
        min_confidence=min_confidence,
    )

    engine = AnalyzerEngine(config=config)
    result: ScanResult = engine.scan(target)

    fmt = fmt.lower()
    exit_code = _compute_exit_code(result, severity_threshold)

    try:
        if fmt == "text":
            reporter = ConsoleReporter(use_colors=not no_color)
            if output:
                with open(output, "w", encoding="utf-8") as fh:
                    reporter.generate(result, output=fh, verbose=verbose)
            else:
                reporter.generate(result, verbose=verbose)

        elif fmt == "json":
            reporter = JsonReporter()
            text = reporter.generate(result, output_path=output)
            if not output:
                click.echo(text)

        elif fmt == "sarif":
            reporter = JsonReporter()
            text = reporter.generate_sarif(result, output_path=output)
            if not output:
                click.echo(text)

        elif fmt == "html":
            reporter = HtmlReporter()
            text = reporter.generate(result, output_path=output)
            if not output:
                click.echo(text, nl=False)

    except BrokenPipeError:
        pass

    sys.exit(exit_code)


@main.command("list-rules", short_help="Muestra las reglas de seguridad activas")
def list_rules():
    """Lista todas las reglas de detección disponibles."""
    engine = AnalyzerEngine()
    rules = engine.list_rules()

    click.secho("🛡️  Reglas de seguridad activas:", bold=True, fg="bright_blue")
    click.echo()
    for rule in rules:
        sev = rule["severity"].lower()
        color_map = {
            "critical": "bright_red",
            "high": "bright_yellow",
            "medium": "yellow",
            "low": "green",
            "info": "blue",
        }
        emoji_map = {
            "critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢", "info": "🔵",
        }
        emoji = emoji_map.get(sev, "⚪")
        color = color_map.get(sev, "white")
        cwe = rule.get("cwe") or ""
        click.echo(
            f"  {emoji} {click.style(rule['id'], bold=True, fg=color)} "
            f"- {rule['title']} "
            f"{click.style(cwe, dim=True) if cwe else ''}"
        )
    click.echo()
    click.secho(f"  Total: {len(rules)} reglas activas", bold=True)


@main.command("demo", short_help="Genera un reporte de demo con un código vulnerable incluido")
@click.option("-f", "--format", "fmt", type=click.Choice(["text", "json", "html"]), default="text", show_default=True)
@click.option("-o", "--output", type=click.Path(dir_okay=False, writable=True), default=None)
def demo(fmt: str, output: Optional[str]):
    """Ejecuta el análisis sobre una muestra de código vulnerable integrada."""
    demo_source = _get_demo_source()

    engine = AnalyzerEngine()
    findings = engine.scan_source(demo_source, file_path="demo.py")

    from .models.finding import ScanResult
    from datetime import datetime
    result = ScanResult(target="demo.py", files_scanned=1, findings=findings)
    result.end_time = datetime.utcnow().isoformat()

    if fmt == "text":
        ConsoleReporter().generate(result, verbose=True)
    elif fmt == "json":
        text = JsonReporter().generate(result, output_path=output)
        if not output:
            click.echo(text)
    elif fmt == "html":
        HtmlReporter().generate(result, output_path=output)
        if output:
            click.secho(f"✅ Reporte HTML generado en: {output}", bold=True, fg="green")

    sys.exit(0)


def _compute_exit_code(result: ScanResult, severity_threshold: Optional[str]) -> int:
    if severity_threshold is None:
        return 0
    threshold = Severity.from_str(severity_threshold)
    order = threshold.order
    for f in result.findings:
        if f.severity.order <= order:
            return 1
    return 0


def _get_demo_source() -> str:
    return '''# -*- coding: utf-8 -*-
"""Código vulnerable de demostración para el SAST Analyzer."""

import sqlite3
import os
import subprocess
import pickle
import hashlib
from flask import Flask, request, render_template_string, send_file

app = Flask(__name__)

# Secreto hardcodeado
API_KEY = "sk-abcdefghijklmnopqrstuvwxyz1234567890"
DB_PASSWORD = "password123"


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    # SQL Injection clásico
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    return str(user)


@app.route("/read_file")
def read_file():
    # Path Traversal
    filename = request.args.get("file", "")
    path = "./uploads/" + filename
    with open(path, "r") as f:
        return f.read()


@app.route("/ping")
def ping():
    host = request.args.get("host", "localhost")
    # Command Injection
    result = os.system(f"ping -c 1 {host}")
    return str(result)


@app.route("/run")
def run_cmd():
    cmd = request.args.get("cmd")
    subprocess.run(cmd, shell=True)
    return "ok"


@app.route("/greet")
def greet():
    name = request.args.get("name", "mundo")
    # XSS via render_template_string
    template = f"<h1>Hola {name}!</h1>"
    return render_template_string(template)


@app.route("/upload", methods=["POST"])
def upload():
    data = request.data
    # Deserialización insegura
    obj = pickle.loads(data)
    return str(obj)


def compute_password_hash(password: str) -> str:
    # Hash débil para contraseñas
    return hashlib.md5(password.encode()).hexdigest()


def insecure_random_token() -> str:
    import random
    # Random no criptográfico
    return str(random.randint(100000, 999999))


@app.route("/exec")
def execute_code():
    code = request.args.get("code")
    # Función peligrosa
    eval(code)
    return "Ejecutado"
'''


if __name__ == "__main__":
    main()
