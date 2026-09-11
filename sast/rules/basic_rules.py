from __future__ import annotations

import ast
import re
from typing import List

from .base import BaseRule
from ..models.finding import Finding
from ..core.parser import ParsedFile


class HardcodedSecretRule(BaseRule):
    """Detecta credenciales y secretos hardcodeados en el código."""

    rule_id = "HARDCODED_SECRET"
    title = "Secreto Hardcodeado"
    severity = "high"
    description = "Se detectó una posible credencial o clave secreta escrita directamente en el código fuente."
    cwe = "CWE-798"
    owasp = "A7:2021-Identification and Authentication Failures"
    recommendation = "Almacena secretos en variables de entorno, gestores de secretos (AWS Secrets Manager, HashiCorp Vault) o archivos de configuración fuera del control de versiones."

    SECRET_PATTERNS = [
        (re.compile(r"""(?i)(password|passwd|pwd|secret|token|api_key|apikey|api_secret|private_key|privatekey|access_key|accesskey|auth_token|authtoken)\s*[:=]\s*["'][^"']{4,}["']"""), 0.9),
        (re.compile(r"""(?i)("|')(?:sk|pk|rk|ak|sa)-[A-Za-z0-9_\-]{10,}\1"""), 0.95),
        (re.compile(r"""(?i)ghp_[A-Za-z0-9]{20,}"""), 0.95),
        (re.compile(r"""(?i)gho_[A-Za-z0-9]{20,}"""), 0.95),
        (re.compile(r"""(?i)ghu_[A-Za-z0-9]{20,}"""), 0.95),
        (re.compile(r"""(?i)ghs_[A-Za-z0-9]{20,}"""), 0.95),
        (re.compile(r"""(?i)-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"""), 0.98),
        (re.compile(r"""(?i)aws_access_key_id["']?\s*[:=]\s*["']AKIA[0-9A-Z]{16}["']"""), 0.98),
        (re.compile(r"""(?i)mongodb\+srv://[^\s"'<>]+:[^\s"'<>]+@"""), 0.96),
        (re.compile(r"""(?i)(postgres|mysql|sqlite|mssql|oracle)://[^\s"'<>]+:[^\s"'<>]+@"""), 0.95),
        (re.compile(r"""(?i)redis://:[^\s"'<>]+@"""), 0.95),
        (re.compile(r"""(?i)amqp://[^\s"'<>]+:[^\s"'<>]+@"""), 0.95),
    ]

    DUMMY_VALUES = {
        "password", "pass", "test", "dummy", "example", "changeme",
        "your_password", "your_password_here", "your_api_key",
        "xxx", "***", "---", "___", "none", "null", "undefined",
        "default", "secret", "token", "key", "password123",
        "admin", "123456", "qwerty", "letmein", "welcome",
        "monkey", "dragon", "master", "abc123", "12345678",
        "passw0rd", "iloveyou", "sunshine", "princess",
    }

    SQL_KEYWORDS = {"SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "JOIN"}

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        for line_num, line in enumerate(parsed.lines, start=1):
            for pattern, base_confidence in self.SECRET_PATTERNS:
                match = pattern.search(line)
                if match:
                    matched_text = match.group(0)
                    if self._is_dummy_match(matched_text):
                        continue
                    confidence = base_confidence
                    finding = self._make_finding(
                        parsed=parsed,
                        line=line_num,
                        column=match.start() + 1,
                        evidence=line.rstrip(),
                        confidence=confidence,
                    )
                    findings.append(finding)
                    break

        for node in ast.walk(parsed.tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                val = node.value.strip()
                if len(val) >= 32 and self._looks_like_secret(val):
                    line_num = getattr(node, "lineno", 0)
                    if line_num and not any(f.line == line_num for f in findings):
                        finding = self._make_finding(
                            parsed=parsed,
                            line=line_num,
                            column=getattr(node, "col_offset", 0) + 1,
                            confidence=0.75,
                        )
                        findings.append(finding)

        return findings

    def _is_dummy_match(self, text: str) -> bool:
        text_lower = text.lower()
        if re.search(r"\{[a-zA-Z_][a-zA-Z0-9_]*\}", text):
            return True
        stripped = text.strip().strip('"').strip("'")
        quote_match = re.search(r"""["']([^"']{1,80})["']""", text)
        if quote_match:
            inner = quote_match.group(1).strip().lower()
            if inner in self.DUMMY_VALUES:
                return True
            if len(inner) <= 5:
                return True
            if inner.startswith("your_") or inner.endswith("_here"):
                return True
        line_upper = text.upper()
        if any(kw in line_upper for kw in self.SQL_KEYWORDS) and ("'" in text or '"' in text):
            if "%" in text or "{" in text:
                return True
        return False

    def _looks_like_secret(self, val: str) -> bool:
        if len(val) < 32:
            return False
        has_upper = any(c.isupper() for c in val)
        has_lower = any(c.islower() for c in val)
        has_digit = any(c.isdigit() for c in val)
        special_count = sum(1 for c in val if not c.isalnum())
        if has_upper and has_lower and has_digit and special_count < len(val) * 0.3:
            entropy = self._shannon_entropy(val)
            return entropy > 3.8
        return False

    def _shannon_entropy(self, data: str) -> float:
        import math
        if not data:
            return 0.0
        freq = {}
        for c in data:
            freq[c] = freq.get(c, 0) + 1
        n = len(data)
        entropy = 0.0
        for count in freq.values():
            p = count / n
            entropy -= p * math.log2(p)
        return entropy


class DangerousFunctionRule(BaseRule):
    """Detecta uso de funciones peligrosas como eval, exec, pickle.loads, etc."""

    rule_id = "DANGEROUS_FUNCTION"
    title = "Uso de Función Peligrosa"
    severity = "high"
    description = "Se detectó el uso de una función potencialmente peligrosa que puede ejecutar código arbitrario si se combina con entrada no confiable."
    cwe = "CWE-676"
    owasp = "A03:2021-Injection"
    recommendation = "Evita usar estas funciones con datos dinámicos. Si son necesarias, valida y sanitiza estrictamente la entrada o usa alternativas seguras."

    DANGEROUS_CALLS = {
        "eval": ("CWE-95", "critical", 0.85, "eval() ejecuta código Python arbitrario. Nunca lo uses con entrada del usuario."),
        "exec": ("CWE-95", "critical", 0.85, "exec() ejecuta código Python arbitrario. Nunca lo uses con entrada del usuario."),
        "compile": ("CWE-95", "high", 0.7, "compile() puede ser usado para ejecutar código dinámico."),
        "pickle.loads": ("CWE-502", "critical", 0.9, "pickle.loads() ejecuta código al deserializar. Nunca cargues pickles de fuentes no confiables."),
        "pickle.load": ("CWE-502", "critical", 0.9, "pickle.load() ejecuta código al deserializar. Nunca cargues pickles de fuentes no confiables."),
        "pickle.Unpickler": ("CWE-502", "critical", 0.9, "Unpickler ejecuta código al deserializar. Nunca lo uses con datos no confiables."),
        "yaml.load": ("CWE-502", "high", 0.85, "yaml.load() sin Loader seguro puede ejecutar código. Usa yaml.safe_load()."),
        "marshal.loads": ("CWE-502", "high", 0.85, "marshal.loads() no es seguro contra datos maliciosos."),
        "marshal.load": ("CWE-502", "high", 0.85, "marshal.load() no es seguro contra datos maliciosos."),
        "shelve.open": ("CWE-502", "high", 0.8, "shelve usa pickle internamente. No abras shelves de fuentes no confiables."),
        "input": ("CWE-20", "info", 0.5, "input() recibe entrada del usuario. Asegúrate de validarla y sanitizarla."),
    }

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []
        from ..core.parser import PythonParser

        parser = PythonParser()

        for func_name, call_node, line in parsed.function_calls:
            matched = None
            if func_name in self.DANGEROUS_CALLS:
                matched = self.DANGEROUS_CALLS[func_name]
            else:
                for key, val in self.DANGEROUS_CALLS.items():
                    if func_name.endswith("." + key):
                        matched = val
                        break

            if matched:
                cwe, severity, confidence, specific_desc = matched
                finding = self._make_finding(
                    parsed=parsed,
                    line=line,
                    column=getattr(call_node, "col_offset", 0) + 1,
                    confidence=confidence,
                )
                finding.title = f"Función Peligrosa: {func_name}()"
                finding.description = specific_desc
                finding.severity = Finding.__annotations__
                from ..models.finding import Severity
                finding.severity = Severity.from_str(severity)
                finding.cwe = cwe
                findings.append(finding)

        return findings
