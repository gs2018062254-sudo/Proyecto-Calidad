from __future__ import annotations

import ast
from typing import List

from .base import BaseRule
from ..models.finding import Finding, Severity
from ..core.parser import ParsedFile


class WeakCryptographyRule(BaseRule):
    """Detecta uso de algoritmos criptográficos débiles o rotos."""

    rule_id = "WEAK_CRYPTO"
    title = "Criptografía Débil"
    severity = "high"
    description = "Se detectó el uso de algoritmos criptográficos obsoletos, rotos o con parámetros de seguridad insuficientes."
    cwe = "CWE-327"
    owasp = "A02:2021-Cryptographic Failures"
    recommendation = "Usa algoritmos modernos y estándares: AES-256-GCM, ChaCha20-Poly1305, RSA-2048+, ECDSA, bcrypt/argon2 para contraseñas. Evita MD5, SHA1, DES, 3DES, RC4."

    WEAK_HASHES = {
        "md5": ("CWE-327", "high", 0.9, "MD5 es roto criptográficamente. No lo uses para integridad ni seguridad. Usa SHA-256 o superior."),
        "sha1": ("CWE-327", "medium", 0.85, "SHA-1 tiene colisiones prácticas conocidas. Usa SHA-256 o SHA-512."),
        "md4": ("CWE-327", "high", 0.95, "MD4 está completamente roto."),
        "md2": ("CWE-327", "high", 0.95, "MD2 está completamente roto."),
    }

    WEAK_CIPHERS = {
        "DES": ("CWE-326", "high", 0.95, "DES tiene clave de 56 bits y es trivial de romper por fuerza bruta."),
        "3DES": ("CWE-326", "high", 0.9, "Triple-DES tiene efectividad de ~112 bits y se considera obsoleto. Usa AES."),
        "RC4": ("CWE-327", "high", 0.9, "RC4 tiene múltiples sesgos y ataques. Usa AES-GCM o ChaCha20-Poly1305."),
        "Blowfish": ("CWE-326", "medium", 0.7, "Blowfish tiene bloque de 64 bits, susceptible a Sweet32. Usa AES."),
        "ECB": ("CWE-327", "high", 0.9, "Modo ECB no es semánticamente seguro y filtra patrones. Usa CBC con IV aleatorio o mejor GCM."),
    }

    WEAK_RANDOM = {
        "random.random",
        "random.randint",
        "random.randrange",
        "random.choice",
        "random.choices",
        "random.sample",
        "random.seed",
        "random.uniform",
    }

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        for func_name, call_node, line in parsed.function_calls:
            findings.extend(self._check_hashlib(func_name, call_node, line, parsed))
            findings.extend(self._check_pycrypto(func_name, call_node, line, parsed))
            findings.extend(self._check_insecure_random(func_name, call_node, line, parsed))

        findings.extend(self._check_constants(parsed))
        return findings

    def _check_hashlib(self, func_name: str, call_node: ast.Call, line: int, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []
        target = None

        if func_name in ("hashlib.md5", "hashlib.sha1", "hashlib.md4"):
            target = func_name.split(".")[-1]
        elif func_name in ("md5", "sha1", "md4"):
            resolved = parsed.resolve_name(func_name)
            if resolved and "hashlib" in resolved:
                target = func_name

        if not target and func_name in ("hashlib.new", "Crypto.Hash.new"):
            if call_node.args and isinstance(call_node.args[0], ast.Constant) and isinstance(call_node.args[0].value, str):
                algo = call_node.args[0].value.lower()
                if algo in self.WEAK_HASHES:
                    target = algo

        if target and target in self.WEAK_HASHES:
            cwe, severity, confidence, desc = self.WEAK_HASHES[target]
            finding = Finding(
                rule_id=f"WEAK_HASH_{target.upper()}",
                title=f"Hash Débil: {target.upper()}",
                severity=Severity.from_str(severity),
                file_path=parsed.file_path,
                line=line,
                column=getattr(call_node, "col_offset", 0) + 1,
                description=desc,
                cwe=cwe,
                owasp=self.owasp,
                confidence=confidence,
                evidence=parsed.get_line(line),
                recommendation="Usa SHA-256, SHA-512 o SHA-3 para integridad. Para contraseñas usa bcrypt, scrypt o Argon2 con sal.",
            )
            findings.append(finding)
        return findings

    def _check_pycrypto(self, func_name: str, call_node: ast.Call, line: int, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []
        func_lower = func_name.lower()

        for cipher_name, (cwe, severity, confidence, desc) in self.WEAK_CIPHERS.items():
            cn_lower = cipher_name.lower()
            if cn_lower in func_lower or (
                call_node.args and isinstance(call_node.args[0], ast.Constant)
                and isinstance(call_node.args[0].value, str)
                and cn_lower in call_node.args[0].value.lower()
            ):
                finding = Finding(
                    rule_id=f"WEAK_CIPHER_{cipher_name}",
                    title=f"Cifrado Débil: {cipher_name}",
                    severity=Severity.from_str(severity),
                    file_path=parsed.file_path,
                    line=line,
                    column=getattr(call_node, "col_offset", 0) + 1,
                    description=desc,
                    cwe=cwe,
                    owasp=self.owasp,
                    confidence=confidence,
                    evidence=parsed.get_line(line),
                    recommendation="Usa AES-256-GCM o ChaCha20-Poly1305 con autenticación AEAD.",
                )
                findings.append(finding)
                break
        return findings

    def _check_insecure_random(self, func_name: str, call_node: ast.Call, line: int, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []
        if func_name in self.WEAK_RANDOM:
            is_resolved = True
            if "." not in func_name:
                resolved = parsed.resolve_name(func_name.split(".")[0])
                if not (resolved and "random" in resolved):
                    is_resolved = False
            if is_resolved:
                finding = Finding(
                    rule_id="INSECURE_RANDOM",
                    title="Números Aleatorios Inseguros",
                    severity=Severity.MEDIUM,
                    file_path=parsed.file_path,
                    line=line,
                    column=getattr(call_node, "col_offset", 0) + 1,
                    description="random.MÉTODO() usa un PRNG no criptográficamente seguro. No es adecuado para tokens, contraseñas, claves, nonces criptográficos ni sorteos.",
                    cwe="CWE-338",
                    owasp=self.owasp,
                    confidence=0.85,
                    evidence=parsed.get_line(line),
                    recommendation="Usa secrets (Python 3.6+) o os.urandom() para seguridad criptográfica. En contextos de Flask/Django usa sus helpers.",
                )
                findings.append(finding)
        return findings

    def _check_constants(self, parsed: ParsedFile) -> List[Finding]:
        """Detecta claves RSA pequeñas o IV hardcodeado."""
        findings: List[Finding] = []
        for var_name, assigns in parsed.assignments.items():
            for line, value in assigns:
                if isinstance(value, ast.Constant) and isinstance(value.value, (int, str)):
                    if var_name.lower() in ("rsa_key_size", "key_size", "bits") and isinstance(value.value, int) and value.value < 2048:
                        finding = Finding(
                            rule_id="SMALL_RSA_KEY",
                            title="Tamaño de Clave RSA Insuficiente",
                            severity=Severity.HIGH,
                            file_path=parsed.file_path,
                            line=line,
                            description=f"RSA con {value.value} bits es considerado débil. El mínimo recomendado hoy es 2048 bits, preferible 3072 o 4096.",
                            cwe="CWE-326",
                            owasp=self.owasp,
                            confidence=0.95,
                            evidence=parsed.get_line(line),
                            recommendation="Usa RSA >= 2048 bits, o mejor curvas elípticas (P-256, Ed25519).",
                        )
                        findings.append(finding)
        return findings


class InsecureHashPasswordRule(BaseRule):
    """Detecta almacenamiento de contraseñas con hashes inseguros o sin sal."""

    rule_id = "INSECURE_PASSWORD_HASH"
    title = "Hash de Contraseña Inseguro"
    severity = "high"
    description = "Las contraseñas no deben almacenarse con MD5/SHA sin sal ni iteraciones. Usa algoritmos adaptados a contraseñas."
    cwe = "CWE-916"
    owasp = "A02:2021-Cryptographic Failures"
    recommendation = "Usa bcrypt, Argon2 (argon2-cffi) o PBKDF2-HMAC-SHA256 con un factor de trabajo (costo/iteraciones) adecuado y sal única por contraseña."

    PASSWORD_CONTEXT = {"password", "passwd", "pwd", "user_password", "user_passwd", "contraseña", "clave"}

    def check(self, parsed: ParsedFile) -> List[Finding]:
        findings: List[Finding] = []

        for var_name, assigns in parsed.assignments.items():
            for line, value in assigns:
                if var_name.lower() in self.PASSWORD_CONTEXT:
                    if isinstance(value, ast.Call):
                        call_name = ""
                        if isinstance(value.func, ast.Attribute):
                            parts = []
                            cur = value.func
                            while isinstance(cur, ast.Attribute):
                                parts.append(cur.attr)
                                cur = cur.value
                            if isinstance(cur, ast.Name):
                                parts.append(cur.id)
                            call_name = ".".join(reversed(parts))
                        elif isinstance(value.func, ast.Name):
                            call_name = value.func.id

                        if call_name and any(h in call_name for h in ("md5", "sha1", "sha256", "sha512")) and not any(
                            safe in call_name for safe in ("pbkdf2", "bcrypt", "argon", "scrypt", "hashpw")
                        ):
                            finding = Finding(
                                rule_id=self.rule_id,
                                title=self.title,
                                severity=Severity.HIGH,
                                file_path=parsed.file_path,
                                line=line,
                                description=f"La contraseña parece estar siendo hasheada con '{call_name}' que es un hash criptográfico general-purpose, no adaptado para contraseñas.",
                                cwe=self.cwe,
                                owasp=self.owasp,
                                confidence=0.8,
                                evidence=parsed.get_line(line),
                                recommendation=self.recommendation,
                            )
                            findings.append(finding)
        return findings
