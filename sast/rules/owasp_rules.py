from __future__ import annotations

import ast
import re
from typing import List

from .base import BaseRule
from ..models.finding import Finding, Severity
from ..core.parser import ParsedFile, PythonParser
from ..core.dataflow import TaintAnalyzer, TaintFlow


class SSRFRule(BaseRule):
    """Detecta Server-Side Request Forgery (SSRF) mediante análisis de flujo de datos y patrones AST/multilenguaje."""

    rule_id = "SSRF"
    title = "Server-Side Request Forgery (SSRF)"
    severity = "high"
    description = (
        "Se detectó una petición HTTP saliente cuya URL o destino proviene de entrada del usuario sin validar "
        "contra una lista blanca de dominios permitidos."
    )
    cwe = "CWE-918"
    owasp = "A10:2021-Server-Side Request Forgery"
    recommendation = (
        "Valida estrictamente las URLs contra una lista blanca (allowlist) de dominios y esquemas (https) permitidos, "
        "y bloquea rangos de IPs privadas/loopback (127.0.0.1, 169.254.169.254, 10.0.0.0/8)."
    )
    fix_snippet = (
        'ALLOWED_HOSTS = {"api.example.com"}\n'
        'parsed_url = urllib.parse.urlparse(user_url)\n'
        'if parsed_url.scheme != "https" or parsed_url.hostname not in ALLOWED_HOSTS:\n'
        '    raise ValueError("Host no autorizado para peticiones salientes")'
    )

    HTTP_METHODS = {
        "requests.get", "requests.post", "requests.put", "requests.delete",
        "requests.patch", "requests.head", "requests.request",
        "urllib.request.urlopen", "urllib.urlopen", "urlopen",
        "httpx.get", "httpx.post",
    }

    def __init__(self):
        super().__init__()
        self.taint_analyzer = TaintAnalyzer()

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        # 1. Taint Flow para SSRF en Python
        taint_results = self.taint_analyzer.analyze_file(parsed)
        for flow in taint_results.get("ssrf", []):
            data_flow = [
                {"line": l, "variable": v, "step": i + 1}
                for i, (l, v) in enumerate(flow.path)
            ]
            finding = Finding(
                rule_id=self.rule_id,
                title=self.title,
                severity=Severity.HIGH,
                file_path=parsed.file_path,
                line=flow.sink_line,
                description=(
                    f"El valor tainted de '{flow.source_var}' (línea {flow.source_line}) "
                    f"se emplea como URL destino en '{flow.sink_call}' (línea {flow.sink_line}), permitiendo SSRF."
                ),
                cwe=self.cwe,
                owasp=self.owasp,
                confidence=0.90,
                evidence=parsed.get_line(flow.sink_line),
                source=f"{flow.source_func} @ línea {flow.source_line}",
                sink=f"{flow.sink_call} @ línea {flow.sink_line}",
                data_flow=data_flow,
                recommendation=self.recommendation,
                fix_snippet=self.fix_snippet,
            )
            findings.append(finding)

        # 2. Detección multi-lenguaje (JS/TS fetch/axios con req.query/req.body)
        existing_lines = {f.line for f in findings}
        multilang_patterns = [
            re.compile(r"""\b(?:fetch|axios\.(?:get|post|put|delete|request))\s*\(\s*(?:req\.(?:query|body|params)|`[^`]*\$\{req\.)"""),
            re.compile(r"""\b(?:file_get_contents|curl_init)\s*\(\s*\$_(?:GET|POST|REQUEST)"""),
        ]
        for line_num, line_text in enumerate(parsed.lines, start=1):
            if line_num in existing_lines:
                continue
            trimmed = line_text.strip()
            if trimmed.startswith("//") or trimmed.startswith("#"):
                continue
            for pat in multilang_patterns:
                if pat.search(line_text):
                    findings.append(
                        self._make_finding(
                            parsed=parsed,
                            line=line_num,
                            confidence=0.86,
                        )
                    )
                    break

        return findings


class InsecureDeserializationRule(BaseRule):
    """Detecta deserialización insegura (CWE-502 / OWASP A08:2021)."""

    rule_id = "INSECURE_DESERIALIZATION"
    title = "Deserialización Insegura"
    severity = "critical"
    description = (
        "La deserialización de objetos binarios o YAML sin un cargador seguro permite la ejecución remota de código (RCE)."
    )
    cwe = "CWE-502"
    owasp = "A08:2021-Software and Data Integrity Failures"
    recommendation = (
        "Usa formatos de datos puros como JSON (json.loads) o yaml.safe_load(). "
        "Nunca deserialices flujos con pickle, marshal o yaml.unsafe_load provenientes de fuentes externas."
    )
    fix_snippet = (
        'import yaml, json\n'
        'safe_data = yaml.safe_load(raw_yaml)\n'
        'safe_obj = json.loads(raw_json)'
    )

    UNSAFE_DESERIALIZERS = {
        "pickle.loads": "Uso de pickle.loads() que permite ejecutar código arbitrario mediante __reduce__.",
        "pickle.load": "Uso de pickle.load() que permite ejecución remota de código al deserializar flujos binarios.",
        "cPickle.loads": "Uso de cPickle.loads() inseguro.",
        "marshal.loads": "Uso de marshal.loads() vulnerable a corrupción de memoria y ejecución de bytecode.",
        "yaml.unsafe_load": "Uso explícito de yaml.unsafe_load() que permite instanciar objetos Python arbitrarios.",
        "jsonpickle.decode": "jsonpickle.decode() permite instanciar clases arbitrarias y ejecutar código.",
    }

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        if parsed.tree is not None:
            for func_name, call_node, line in parsed.function_calls:
                matched_desc = None
                if func_name in self.UNSAFE_DESERIALIZERS:
                    matched_desc = self.UNSAFE_DESERIALIZERS[func_name]
                elif func_name == "yaml.load":
                    has_safe_loader = False
                    for kw in call_node.keywords:
                        if kw.arg == "Loader":
                            loader_src = ast.unparse(kw.value) if hasattr(ast, "unparse") else ""
                            if "SafeLoader" in loader_src or "CSafeLoader" in loader_src:
                                has_safe_loader = True
                    if not has_safe_loader:
                        matched_desc = "yaml.load() invocado sin Loader=yaml.SafeLoader permite ejecución de código arbitrario."

                if matched_desc:
                    finding = self._make_finding(
                        parsed=parsed,
                        line=line,
                        column=getattr(call_node, "col_offset", 0) + 1,
                        confidence=0.93,
                    )
                    finding.description = matched_desc
                    findings.append(finding)

        existing_lines = {f.line for f in findings}
        multilang_patterns = [
            (re.compile(r"""\bunserialize\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)"""), "Deserialización directa de entrada de usuario en PHP via unserialize()."),
            (re.compile(r"""\bnew\s+ObjectInputStream\s*\("""), "Uso de ObjectInputStream en Java susceptible a ataques de deserialización (Gadget Chains)."),
        ]
        for line_num, line_text in enumerate(parsed.lines, start=1):
            if line_num in existing_lines:
                continue
            for pat, desc in multilang_patterns:
                if pat.search(line_text):
                    finding = self._make_finding(parsed=parsed, line=line_num, confidence=0.88)
                    finding.description = desc
                    findings.append(finding)
                    break

        return findings


class SecurityMisconfigurationRule(BaseRule):
    """Detecta configuraciones inseguras: validación SSL deshabilitada, modo debug activo en producción o CORS comodín."""

    rule_id = "SECURITY_MISCONFIGURATION"
    title = "Configuración de Seguridad Incorrecta (SSL / Debug / CORS)"
    severity = "high"
    description = (
        "Se detectó una configuración insegura como desactivación de verificación de certificados TLS (verify=False), "
        "modo depuración (debug=True) expuesto o política CORS excesivamente permisiva."
    )
    cwe = "CWE-295"
    owasp = "A05:2021-Security Misconfiguration"
    recommendation = (
        "Mantén siempre verify=True en peticiones TLS/HTTPS, desactiva debug=True en entornos productivos "
        "y restringe los orígenes permitidos en CORS."
    )
    fix_snippet = (
        'response = requests.get(url, verify=True, timeout=10)\n'
        'app.run(host="127.0.0.1", port=8000, debug=False)'
    )

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        if parsed.tree is not None:
            for func_name, call_node, line in parsed.function_calls:
                # 1. Detectar verify=False en requests / httpx
                if any(h in func_name for h in ("requests.", "httpx.", "session.")):
                    for kw in call_node.keywords:
                        if kw.arg == "verify" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                            f = self._make_finding(
                                parsed=parsed,
                                line=line,
                                column=getattr(call_node, "col_offset", 0) + 1,
                                confidence=0.95,
                            )
                            f.title = "Verificación de Certificado SSL/TLS Deshabilitada (verify=False)"
                            f.description = (
                                f"La llamada a '{func_name}' deshabilita la validación de certificados TLS (verify=False), "
                                "exponiendo la comunicación a ataques Man-in-the-Middle (MitM)."
                            )
                            f.cwe = "CWE-295"
                            findings.append(f)

                # 2. Detectar debug=True en app.run() (Flask / FastAPI)
                if func_name.endswith(".run") or func_name == "run":
                    for kw in call_node.keywords:
                        if kw.arg == "debug" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                            f = self._make_finding(
                                parsed=parsed,
                                line=line,
                                column=getattr(call_node, "col_offset", 0) + 1,
                                confidence=0.90,
                            )
                            f.title = "Modo Debug Habilitado en Aplicación Web (debug=True)"
                            f.description = (
                                "Ejecutar el servidor con debug=True expone trazas de pila interactivas (Werkzeug debugger) "
                                "que pueden permitir ejecución remota de código."
                            )
                            f.cwe = "CWE-489"
                            f.severity = Severity.HIGH
                            findings.append(f)

                # 3. Detectar ssl._create_unverified_context
                if "_create_unverified_context" in func_name:
                    f = self._make_finding(
                        parsed=parsed,
                        line=line,
                        column=getattr(call_node, "col_offset", 0) + 1,
                        confidence=0.95,
                    )
                    f.title = "Contexto SSL sin Verificación (_create_unverified_context)"
                    f.cwe = "CWE-295"
                    findings.append(f)

        return findings


class JWTWeaknessRule(BaseRule):
    """Detecta validación insegura de JSON Web Tokens (JWT) sin verificación de firma o con algoritmo 'none'."""

    rule_id = "JWT_WEAKNESS"
    title = "Validación Insegura de Token JWT"
    severity = "high"
    description = (
        "Se detectó la decodificación o emisión de un token JWT deshabilitando la verificación de firma criptográfica "
        "o permitiendo el algoritmo inseguro 'none'."
    )
    cwe = "CWE-347"
    owasp = "A07:2021-Identification and Authentication Failures"
    recommendation = (
        "Verifica siempre la firma criptográfica en jwt.decode() especificando explícitamente algoritmos robustos "
        "(ej. algorithms=['HS256', 'RS256']) y manteniendo verify_signature=True."
    )
    fix_snippet = (
        'payload = jwt.decode(\n'
        '    token,\n'
        '    SECRET_KEY,\n'
        '    algorithms=["HS256"],\n'
        '    options={"verify_signature": True}\n'
        ')'
    )

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        if parsed.tree is not None:
            for func_name, call_node, line in parsed.function_calls:
                if func_name.endswith("jwt.decode") or func_name == "decode":
                    is_unsafe = False
                    reason = ""
                    for kw in call_node.keywords:
                        if kw.arg == "verify" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                            is_unsafe = True
                            reason = "Se deshabilitó la verificación de firma JWT mediante verify=False."
                        elif kw.arg == "options" and isinstance(kw.value, ast.Dict):
                            for k, v in zip(kw.value.keys, kw.value.values):
                                if (
                                    isinstance(k, ast.Constant)
                                    and k.value == "verify_signature"
                                    and isinstance(v, ast.Constant)
                                    and v.value is False
                                ):
                                    is_unsafe = True
                                    reason = "Se deshabilitó la verificación de firma JWT con options={'verify_signature': False}."
                        elif kw.arg in ("algorithms", "algorithm"):
                            src = ast.unparse(kw.value).lower() if hasattr(ast, "unparse") else ""
                            if "'none'" in src or '"none"' in src:
                                is_unsafe = True
                                reason = "Se permite el algoritmo 'none' en JWT, facilitando la falsificación de tokens."

                    if is_unsafe:
                        f = self._make_finding(
                            parsed=parsed,
                            line=line,
                            column=getattr(call_node, "col_offset", 0) + 1,
                            confidence=0.95,
                        )
                        f.description = reason
                        f.severity = Severity.CRITICAL
                        findings.append(f)

        return findings
