from __future__ import annotations

import ast
from typing import List

from .base import BaseRule
from ..models.finding import Finding
from ..core.parser import ParsedFile
from ..core.dataflow import TaintAnalyzer, TaintFlow


class SQLInjectionRule(BaseRule):
    """Detecta SQL Injection mediante análisis de flujo de datos y patrones AST."""

    rule_id = "SQL_INJECTION"
    title = "Inyección SQL"
    severity = "critical"
    description = "Se detectó una consulta SQL construida con datos que pueden provenir de entrada del usuario sin sanitización, lo que podría permitir inyección SQL."
    cwe = "CWE-89"
    owasp = "A03:2021-Injection"
    recommendation = "Usa consultas parametrizadas (prepared statements) con placeholders en lugar de concatenar strings. Evita construir SQL dinámicamente con entrada del usuario."

    SQL_EXEC_METHODS = {
        "execute", "executemany", "executescript",
        "raw", "query", "select", "from_statement",
    }

    def __init__(self):
        super().__init__()
        self.taint_analyzer = TaintAnalyzer()

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        taint_results = self.taint_analyzer.analyze_file(parsed)
        for flow in taint_results.get("sql", []):
            confidence = self._calculate_confidence(flow)
            finding = self._make_taint_finding(parsed, flow, confidence)
            findings.append(finding)

        findings.extend(self._check_string_concat_sql(parsed))

        return findings

    def _calculate_confidence(self, flow: TaintFlow) -> float:
        base = 0.7
        if flow.source_func and ("input" in flow.source_func or "request" in flow.source_func):
            base += 0.15
        if flow.path and len(flow.path) > 2:
            base -= 0.05 * (len(flow.path) - 2)
        if "execute" in flow.sink_call:
            base += 0.1
        return max(0.5, min(0.98, base))

    def _make_taint_finding(self, parsed: ParsedFile, flow: TaintFlow, confidence: float) -> Finding:
        from ..models.finding import Severity

        data_flow = [
            {"line": l, "variable": v, "step": i + 1}
            for i, (l, v) in enumerate(flow.path)
        ]

        finding = Finding(
            rule_id=self.rule_id,
            title=self.title,
            severity=Severity.CRITICAL,
            file_path=parsed.file_path,
            line=flow.sink_line,
            description=f"El valor tainted de '{flow.source_var}' (línea {flow.source_line}) "
                        f"alcanza el método SQL '{flow.sink_call}' (línea {flow.sink_line}) "
                        f"sin sanitización adecuada.",
            cwe=self.cwe,
            owasp=self.owasp,
            confidence=confidence,
            evidence=parsed.get_line(flow.sink_line),
            source=f"{flow.source_func} @ línea {flow.source_line}",
            sink=f"{flow.sink_call} @ línea {flow.sink_line}",
            data_flow=data_flow,
            recommendation=self.recommendation,
        )
        return finding

    def _check_string_concat_sql(self, parsed: ParsedFile) -> List[Finding]:
        """Detecta concatenación de strings en llamadas a execute()."""
        findings: List[Finding] = []
        from ..core.parser import PythonParser

        parser = PythonParser()

        for func_name, call_node, line in parsed.function_calls:
            last_part = func_name.split(".")[-1] if "." in func_name else func_name
            if last_part in self.SQL_EXEC_METHODS and call_node.args:
                first_arg = call_node.args[0]
                if self._is_dynamic_string_builder(first_arg):
                    has_tainted = False
                    tainted_names = parser.get_node_names(first_arg)
                    for name in tainted_names:
                        if name in parsed.assignments:
                            has_tainted = True
                            break
                    if has_tainted or isinstance(first_arg, (ast.BinOp, ast.JoinedStr)):
                        confidence = 0.6 if not isinstance(first_arg, ast.JoinedStr) else 0.7
                        finding = self._make_finding(
                            parsed=parsed,
                            line=line,
                            column=getattr(call_node, "col_offset", 0) + 1,
                            confidence=confidence,
                        )
                        finding.description = "Consulta SQL construida mediante concatenación de strings o f-string, lo que es propenso a inyección SQL si contiene datos del usuario."
                        findings.append(finding)
        return findings

    def _is_dynamic_string_builder(self, node: ast.AST) -> bool:
        if isinstance(node, ast.JoinedStr):
            return True
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Mod)):
            return True
        if isinstance(node, ast.Call):
            call_name = ""
            if isinstance(node.func, ast.Attribute):
                call_name = node.func.attr
            if call_name in ("format", "__add__", "join", "replace"):
                return True
        return False


class CommandInjectionRule(BaseRule):
    """Detecta Command Injection mediante análisis de flujo tainted."""

    rule_id = "COMMAND_INJECTION"
    title = "Inyección de Comandos"
    severity = "critical"
    description = "Se detectó que datos que pueden provenir de entrada del usuario llegan a una función que ejecuta comandos del sistema operativo."
    cwe = "CWE-78"
    owasp = "A03:2021-Injection"
    recommendation = "Evita ejecutar comandos del sistema con datos del usuario. Usa APIs de bibliotecas en lugar de shell. Si es necesario, usa subprocess con argumentos como lista (no shell=True) y valida estrictamente la entrada."

    def __init__(self):
        super().__init__()
        self.taint_analyzer = TaintAnalyzer()

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        taint_results = self.taint_analyzer.analyze_file(parsed)
        for flow in taint_results.get("command", []):
            confidence = self._calculate_confidence(flow)
            data_flow = [
                {"line": l, "variable": v, "step": i + 1}
                for i, (l, v) in enumerate(flow.path)
            ]
            from ..models.finding import Severity

            finding = Finding(
                rule_id=self.rule_id,
                title=self.title,
                severity=Severity.CRITICAL,
                file_path=parsed.file_path,
                line=flow.sink_line,
                description=f"El valor tainted de '{flow.source_var}' (línea {flow.source_line}) "
                            f"alcanza la ejecución de comando '{flow.sink_call}' (línea {flow.sink_line}).",
                cwe=self.cwe,
                owasp=self.owasp,
                confidence=confidence,
                evidence=parsed.get_line(flow.sink_line),
                source=f"{flow.source_func} @ línea {flow.source_line}",
                sink=f"{flow.sink_call} @ línea {flow.sink_line}",
                data_flow=data_flow,
                recommendation=self.recommendation,
            )
            findings.append(finding)

        findings.extend(self._check_shell_true(parsed))
        return findings

    def _calculate_confidence(self, flow: TaintFlow) -> float:
        base = 0.85
        if flow.source_func and ("input" in flow.source_func or "request" in flow.source_func):
            base += 0.1
        if flow.path and len(flow.path) > 3:
            base -= 0.05 * (len(flow.path) - 3)
        return max(0.6, min(0.99, base))

    def _check_shell_true(self, parsed: ParsedFile) -> List[Finding]:
        """Detecta subprocess con shell=True."""
        findings: List[Finding] = []
        for func_name, call_node, line in parsed.function_calls:
            if "subprocess" in func_name or func_name in ("Popen", "run", "call", "check_call", "check_output"):
                for kw in call_node.keywords:
                    if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                        from ..models.finding import Severity

                        finding = Finding(
                            rule_id="SHELL_TRUE",
                            title="Uso de shell=True en subprocess",
                            severity=Severity.HIGH,
                            file_path=parsed.file_path,
                            line=line,
                            description="El uso de shell=True con subprocess permite la interpretación de metacaracteres de shell y es un vector común para inyección de comandos.",
                            cwe="CWE-78",
                            owasp="A03:2021-Injection",
                            confidence=0.92,
                            evidence=parsed.get_line(line),
                            recommendation="Usa shell=False (predeterminado) y pasa los argumentos como una lista en lugar de un string.",
                        )
                        findings.append(finding)
                        break
        return findings


class PathTraversalRule(BaseRule):
    """Detecta Path Traversal / Local File Inclusion."""

    rule_id = "PATH_TRAVERSAL"
    title = "Path Traversal"
    severity = "high"
    description = "Datos que pueden provenir de entrada del usuario se usan en operaciones de archivo sin validación de ruta, lo que podría permitir acceso a archivos fuera del directorio permitido."
    cwe = "CWE-22"
    owasp = "A01:2021-Broken Access Control"
    recommendation = "Valida y normaliza las rutas. Usa os.path.realpath() y verifica que el resultado esté dentro de un directorio base permitido. Nunca concatenes ciegamente entrada del usuario a rutas de archivos."

    def __init__(self):
        super().__init__()
        self.taint_analyzer = TaintAnalyzer()

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        taint_results = self.taint_analyzer.analyze_file(parsed)
        for flow in taint_results.get("path", []):
            confidence = self._calculate_confidence(flow)
            data_flow = [
                {"line": l, "variable": v, "step": i + 1}
                for i, (l, v) in enumerate(flow.path)
            ]
            from ..models.finding import Severity

            finding = Finding(
                rule_id=self.rule_id,
                title=self.title,
                severity=Severity.HIGH,
                file_path=parsed.file_path,
                line=flow.sink_line,
                description=f"El valor tainted de '{flow.source_var}' (línea {flow.source_line}) "
                            f"alcanza la operación de archivo '{flow.sink_call}' (línea {flow.sink_line}).",
                cwe=self.cwe,
                owasp=self.owasp,
                confidence=confidence,
                evidence=parsed.get_line(flow.sink_line),
                source=f"{flow.source_func} @ línea {flow.source_line}",
                sink=f"{flow.sink_call} @ línea {flow.sink_line}",
                data_flow=data_flow,
                recommendation=self.recommendation,
            )
            findings.append(finding)

        return findings

    def _calculate_confidence(self, flow: TaintFlow) -> float:
        base = 0.75
        if flow.source_func and ("request" in flow.source_func):
            base += 0.15
        return max(0.55, min(0.95, base))


class XSSRule(BaseRule):
    """Detecta Cross-Site Scripting reflejado."""

    rule_id = "XSS"
    title = "Cross-Site Scripting (XSS)"
    severity = "high"
    description = "Datos que pueden provenir de entrada del usuario llegan a una función de renderizado sin escape, lo que podría permitir XSS reflejado."
    cwe = "CWE-79"
    owasp = "A03:2021-Injection"
    recommendation = "Escapa siempre la salida antes de renderizarla en HTML. Usa plantillas auto-escapantes (Jinja2 por defecto lo hace salvo | safe). Evita render_template_string con datos dinámicos."

    def __init__(self):
        super().__init__()
        self.taint_analyzer = TaintAnalyzer()

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        taint_results = self.taint_analyzer.analyze_file(parsed)
        for flow in taint_results.get("xss", []):
            confidence = self._calculate_confidence(flow)
            data_flow = [
                {"line": l, "variable": v, "step": i + 1}
                for i, (l, v) in enumerate(flow.path)
            ]
            from ..models.finding import Severity

            finding = Finding(
                rule_id=self.rule_id,
                title=self.title,
                severity=Severity.HIGH,
                file_path=parsed.file_path,
                line=flow.sink_line,
                description=f"El valor tainted de '{flow.source_var}' (línea {flow.source_line}) "
                            f"llega a renderizado HTML sin escape via '{flow.sink_call}' (línea {flow.sink_line}).",
                cwe=self.cwe,
                owasp=self.owasp,
                confidence=confidence,
                evidence=parsed.get_line(flow.sink_line),
                source=f"{flow.source_func} @ línea {flow.source_line}",
                sink=f"{flow.sink_call} @ línea {flow.sink_line}",
                data_flow=data_flow,
                recommendation=self.recommendation,
            )
            findings.append(finding)

        return findings

    def _calculate_confidence(self, flow: TaintFlow) -> float:
        base = 0.8
        if "render_template_string" in flow.sink_call:
            base += 0.15
        return max(0.55, min(0.97, base))
